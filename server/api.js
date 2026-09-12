'use strict';

/**
 * Toutes les routes HTTP de l'API.
 *
 * Trois publics : les pages (memes reponses en SSR et cote client), les jeux
 * (`/api/v1/games/…`, authentifies par cle), et l'admin. Les erreurs
 * attendues portent `expected` et un statut ; le reste est un 500 logue.
 */

const config = require('./config');
const repo = require('./repo');
const auth = require('./auth');
const discord = require('./discord');
const ingest = require('./ingest');
const rating = require('./rating');
const periods = require('./periods');
const challenges = require('./challenges');
const community = require('./community');
const metrics = require('./metrics');
const { newToken, sha256, normalizePseudo, ApiError, validateAvatar } = require('./util');

const guard = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err && err.expected) return res.status(err.status || 400).json({ error: err.message });
    console.error('[podium] erreur API', err);
    res.status(500).json({ error: 'Erreur interne.' });
  }
};

const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

/* ------------------------------------------------------------------ */
/* Vues                                                               */
/* ------------------------------------------------------------------ */

function userView(u) {
  const pub = repo.publicUser(u);
  return pub ? { ...pub, hasPassword: u.hasPassword, discordName: u.discordName } : null;
}

function gameView(g, { stats = true } = {}) {
  const v = repo.publicGame(g);
  if (stats) v.stats = repo.gameStats(g.slug);
  return v;
}

function matchView(m) {
  const game = repo.gameBySlug(m.gameSlug);
  const players = repo.matchPlayers(m.id).map((p) => ({
    position: p.position, userId: p.userId, pseudo: p.pseudo, nickname: p.nickname,
    avatar: p.userAvatar || p.avatar || '🙂', score: p.score, rank: p.rank,
    ratingBefore: p.ratingBefore, ratingAfter: p.ratingAfter, points: p.points,
  }));
  const challenge = m.challengeId ? repo.challengeById(m.challengeId) : null;
  return {
    id: m.id, gameSlug: m.gameSlug, gameName: game?.name || m.gameSlug, gameEmoji: game?.emoji || '🎮', mode: m.mode,
    challenge: challenge ? { id: challenge.id, slug: challenge.slug, title: challenge.title } : null,
    playedAt: m.playedAt, durationS: m.durationS, playersCount: m.playersCount, rated: m.rated, meta: m.meta, players,
  };
}

function ladderView(slug, limit = 100) {
  let pos = 0;
  return repo.gameLadder(slug, limit, config.rating.placementMatches).map((r) => {
    const placed = r.matches >= config.rating.placementMatches;
    if (placed) pos += 1;
    return {
      pos: placed ? pos : null, userId: r.user_id, pseudo: r.pseudo, avatar: r.avatar,
      rating: Math.round(r.rating), matches: r.matches, wins: r.wins, podiums: r.podiums, peak: Math.round(r.peak),
      tier: rating.tierOf(r.rating, r.matches),
    };
  });
}

function seasonRows(rows) {
  return rows.map((r, i) => ({ pos: i + 1, userId: r.id, pseudo: r.pseudo, avatar: r.avatar, points: r.points, matches: r.matches, wins: r.wins, games: r.games }));
}

function seasonInfo(key) {
  const tz = config.timeZone;
  const now = Date.now();
  const current = periods.monthOf(now, tz);
  const chosen = (key && periods.monthFromKey(key, tz)) || current;
  const bounds = repo.matchBounds();
  const keys = [];
  let cursor = bounds.first ? periods.monthOf(bounds.first, tz) : current;
  for (let i = 0; i < 60 && cursor.start <= current.start; i++) {
    keys.push({ key: cursor.key, label: cursor.label });
    cursor = periods.monthOf(cursor.end + 1, tz);
  }
  if (!keys.some((k) => k.key === current.key)) keys.push({ key: current.key, label: current.label });
  return { season: { key: chosen.key, label: chosen.label, start: chosen.start, end: chosen.end, current: chosen.key === current.key }, seasons: keys.reverse() };
}

function challengeView(ch, { board = 0, withSeed = false } = {}) {
  const v = challenges.view(ch, { withSeed });
  const game = ch.gameSlug ? repo.gameBySlug(ch.gameSlug) : null;
  v.game = game ? { slug: game.slug, name: game.name, emoji: game.emoji, color: game.color, url: game.url } : null;
  if (board) v.board = repo.challengeBoard(ch, board);
  if (ch.closedAt) v.winners = repo.challengeBadges(ch.id);
  return v;
}

/* ------------------------------------------------------------------ */
/* Routes                                                             */
/* ------------------------------------------------------------------ */

function register(app) {
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, users: repo.userCount(), matches: repo.countMatches(), uptime: Math.round(process.uptime()) });
  });

  /* ---- Accueil ---------------------------------------------------- */

  app.get('/api/home', guard((req, res) => {
    const now = Date.now();
    const tz = config.timeZone;
    const week = periods.weekOf(now, tz);
    const month = periods.monthOf(now, tz);
    res.json({
      games: repo.games().filter((g) => g.status !== 'off').map((g) => gameView(g)),
      stats: {
        users: repo.userCount(), matches: repo.countMatches(), matchesWeek: repo.countMatchesSince(week.start),
        activeChallenges: repo.activeChallenges(now).length,
      },
      challenges: repo.activeChallenges(now).map((c) => challengeView(c, { board: 3 })),
      season: { key: month.key, label: month.label, rows: seasonRows(repo.seasonLadder(month.start, month.end, 5)) },
      matches: repo.recentMatches(8).map(matchView),
    });
  }));

  /* ---- Jeux ------------------------------------------------------- */

  app.get('/api/games', guard((req, res) => {
    res.json({ games: repo.games().filter((g) => g.status !== 'off').map((g) => gameView(g)) });
  }));

  app.get('/api/games/:slug', guard((req, res) => {
    const game = repo.gameBySlug(req.params.slug);
    if (!game || game.status === 'off') throw new ApiError('Jeu inconnu.', 404);
    const now = Date.now();
    const month = periods.monthOf(now, config.timeZone);
    res.json({
      game: gameView(game),
      ladder: ladderView(game.slug, 50),
      season: { key: month.key, label: month.label, rows: seasonRows(repo.seasonGameLadder(game.slug, month.start, month.end, 10)) },
      challenges: repo.activeGameChallenges(game.slug, now).map((c) => challengeView(c, { board: 3 })),
      matches: repo.recentGameMatches(game.slug, 10).map(matchView),
    });
  }));

  /* ---- Classements ------------------------------------------------ */

  app.get('/api/leaderboard', guard((req, res) => {
    const info = seasonInfo(req.query.season);
    const game = req.query.game ? repo.gameBySlug(String(req.query.game)) : null;
    if (req.query.game && !game) throw new ApiError('Jeu inconnu.', 404);
    const rows = game
      ? seasonRows(repo.seasonGameLadder(game.slug, info.season.start, info.season.end, 100))
      : seasonRows(repo.seasonLadder(info.season.start, info.season.end, 100));
    res.json({
      ...info,
      game: game ? gameView(game, { stats: false }) : null,
      rows,
      games: repo.games().filter((g) => g.status !== 'off').map((g) => ({ slug: g.slug, name: g.name, emoji: g.emoji, color: g.color, ladder: ladderView(g.slug, 10) })),
    });
  }));

  /* ---- Defis ------------------------------------------------------ */

  app.get('/api/challenges', guard((req, res) => {
    const now = Date.now();
    res.json({
      active: repo.activeChallenges(now).map((c) => challengeView(c, { board: 5 })),
      upcoming: repo.upcomingChallenges(now, 10).map((c) => challengeView(c)),
      past: repo.pastChallenges(now, 20).map((c) => challengeView(c, { board: 3 })),
    });
  }));

  app.get('/api/challenges/:slug', guard((req, res) => {
    const ch = repo.challengeBySlug(req.params.slug) || repo.challengeById(req.params.slug);
    if (!ch) throw new ApiError('Defi inconnu.', 404);
    const v = challengeView(ch, { board: 100 });
    // La graine d'un defi passe n'a plus rien a proteger.
    if (ch.kind === 'mode' && ch.endsAt < Date.now()) v.seed = ch.seed;
    res.json({ challenge: v });
  }));

  /* ---- Joueurs ---------------------------------------------------- */

  app.get('/api/players/:pseudo', guard((req, res) => {
    const user = repo.userByNorm(normalizePseudo(req.params.pseudo)) || repo.userById(req.params.pseudo);
    if (!user) throw new ApiError('Joueur inconnu.', 404);
    const month = periods.monthOf(Date.now(), config.timeZone);
    const season = repo.userSeason(user.id, month.start, month.end);
    const ratings = repo.userRatings(user.id).map((r) => ({
      gameSlug: r.game_slug, gameName: r.game_name, gameEmoji: r.game_emoji,
      rating: Math.round(r.rating), matches: r.matches, wins: r.wins, podiums: r.podiums, peak: Math.round(r.peak),
      tier: rating.tierOf(r.rating, r.matches),
      pos: r.matches >= config.rating.placementMatches ? repo.gameRankOf(r.game_slug, r.rating, config.rating.placementMatches) : null,
      history: repo.userGameHistory(user.id, r.game_slug, 30),
    }));
    res.json({
      user: repo.publicUser(user),
      me: !!req.user && req.user.id === user.id,
      ratings,
      season: {
        key: month.key, label: month.label, points: season?.points || 0, matches: season?.matches || 0, wins: season?.wins || 0,
        pos: season?.points ? repo.userSeasonRank(season.points, month.start, month.end) : null,
      },
      badges: repo.userBadges(user.id),
      matches: repo.userMatches(user.id, 20).map((m) => ({
        ...matchView(m), mine: { score: m.score, rank: m.rank, ratingBefore: m.ratingBefore, ratingAfter: m.ratingAfter, points: m.points },
      })),
    });
  }));

  app.get('/api/players', guard((req, res) => {
    const qn = normalizePseudo(req.query.q);
    if (qn.length < 2) return res.json({ players: [] });
    res.json({ players: repo.searchUsers(qn).map(repo.publicUser) });
  }));

  /* ---- Authentification ------------------------------------------- */

  app.get('/api/auth/me', guard((req, res) => {
    res.json({ user: userView(req.user), providers: { password: config.auth.passwordLogin, discord: discord.enabled() } });
  }));

  app.post('/api/auth/register', guard((req, res) => {
    const user = auth.register(req.body || {});
    auth.openSession(res, user, req);
    metrics.loginsTotal.inc({ method: 'register' });
    res.status(201).json({ user: userView(user) });
  }));

  app.post('/api/auth/login', guard((req, res) => {
    const user = auth.login(req.body || {}, ipOf(req));
    auth.openSession(res, user, req);
    metrics.loginsTotal.inc({ method: 'password' });
    res.json({ user: userView(user) });
  }));

  app.post('/api/auth/logout', guard((req, res) => {
    auth.closeSession(req, res);
    res.json({ ok: true });
  }));

  app.patch('/api/auth/me', guard((req, res) => {
    const user = auth.updateProfile(auth.requireUser(req), req.body || {});
    auth.refreshSso(res, user);
    res.json({ user: userView(user) });
  }));

  app.get('/api/auth/export', guard((req, res) => {
    const user = auth.requireUser(req);
    res.set('Content-Disposition', `attachment; filename="podium-${user.pseudoNorm.replace(/[^a-z0-9]+/g, '-')}.json"`);
    res.json(auth.exportAccount(user));
  }));

  app.delete('/api/auth/me', guard((req, res) => {
    const user = auth.requireUser(req);
    auth.deleteAccount(user, req.body || {});
    auth.closeSession(req, res);
    res.json({ ok: true });
  }));

  app.post('/api/auth/password', guard((req, res) => {
    auth.changePassword(auth.requireUser(req), req.body || {});
    res.json({ ok: true });
  }));

  app.get('/api/auth/discord', guard((req, res) => discord.start(req, res)));
  app.get('/api/auth/discord/callback', guard(async (req, res) => {
    try {
      await discord.callback(req, res);
      metrics.loginsTotal.inc({ method: 'discord' });
    } catch (err) {
      if (!err.expected) throw err;
      res.redirect(`/connexion?erreur=${encodeURIComponent(err.message)}`);
    }
  }));

  /* ---- API jeux (v1) ---------------------------------------------- */

  app.get('/api/v1/games/:slug/challenges/active', guard((req, res) => {
    const game = repo.gameBySlug(req.params.slug);
    if (!game) throw new ApiError('Jeu inconnu.', 404);
    const now = Date.now();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      now,
      challenges: repo.activeGameChallenges(game.slug, now)
        .filter((c) => c.gameSlug === game.slug)
        .map((c) => challenges.view(c, { withSeed: true, now })),
    });
  }));

  app.post('/api/v1/games/:slug/results', guard((req, res) => {
    const game = repo.gameBySlug(req.params.slug);
    if (!game) throw new ApiError('Jeu inconnu.', 404);
    try {
      ingest.authenticate(game, req.headers.authorization);
      const out = ingest.ingest(game, req.body);
      metrics.resultsTotal.inc({ game: game.slug, status: out.duplicate ? 'duplicate' : 'ok' });
      res.json({ ok: true, matchId: out.match.externalId, duplicate: out.duplicate, ratings: out.ratings });
    } catch (err) {
      if (err.expected) {
        metrics.resultsTotal.inc({ game: game.slug, status: err.status === 401 ? 'unauthorized' : 'invalid' });
        repo.log(game.slug, req.body?.matchId ? String(req.body.matchId).slice(0, 120) : null, 'rejected', err.message);
      }
      throw err;
    }
  }));

  /* ---- Salon -------------------------------------------------------- */

  /**
   * Le fil.
   *
   * Lecture ouverte a tous — on doit pouvoir voir de quoi on parle avant de
   * decider d'entrer. L'ecriture, elle, demande un compte.
   */
  app.get('/api/chat', guard((req, res) => {
    const { messages, cursor } = community.chatSince(req.query.since, req.query.limit);
    const user = req.user || null;
    res.json({
      messages,
      cursor,
      me: user ? { id: user.id, role: user.role } : null,
      limits: { length: config.limits.chatLength, gapMs: config.limits.chatGapMs, keepDays: config.limits.chatKeepDays },
    });
  }));

  app.post('/api/chat', guard((req, res) => {
    const message = community.postChat(auth.requireUser(req), req.body?.body);
    res.json({ message });
  }));

  app.delete('/api/chat/:id', guard((req, res) => {
    res.json({ message: community.removeChat(auth.requireUser(req), req.params.id) });
  }));

  /* ---- Avis --------------------------------------------------------- */

  app.get('/api/avis', guard((req, res) => {
    const user = auth.requireUser(req);
    res.json({ mine: community.myFeedback(user), limits: { length: config.limits.feedbackLength } });
  }));

  app.post('/api/avis', guard((req, res) => {
    res.json({ feedback: community.postFeedback(auth.requireUser(req), req.body || {}) });
  }));

  /* ---- Administration --------------------------------------------- */

  /** Relecture des avis : la mesure, sa repartition, et les retours eux-memes. */
  app.get('/api/admin/reporting', guard((req, res) => {
    auth.requireAdmin(req);
    res.json(community.reporting({
      days: req.query.days,
      kind: String(req.query.kind || ''),
      status: String(req.query.status || ''),
      limit: req.query.limit,
      offset: req.query.offset,
    }));
  }));

  app.patch('/api/admin/reporting/:id', guard((req, res) => {
    const admin = auth.requireAdmin(req);
    res.json({ feedback: community.setFeedbackStatus(admin, req.params.id, req.body || {}) });
  }));


  app.get('/api/admin/overview', guard((req, res) => {
    auth.requireAdmin(req);
    res.json({
      games: repo.games().map((g) => ({ ...repo.publicGame(g), stats: repo.gameStats(g.slug) })),
      logs: repo.recentLogs(50),
      users: repo.userCount(),
      challenges: {
        active: repo.activeChallenges().map((c) => challengeView(c)),
        upcoming: repo.upcomingChallenges(Date.now(), 20).map((c) => challengeView(c)),
      },
      metrics: challenges.METRICS,
      timeZone: config.timeZone,
    });
  }));

  const gameInput = (body, existing) => {
    const slug = existing ? existing.slug : String(body.slug || '').toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(slug)) throw new ApiError('slug : minuscules, chiffres et tirets, 2 a 31 caracteres.');
    const name = String(body.name ?? existing?.name ?? '').trim().slice(0, 40);
    if (name.length < 2) throw new ApiError('Nom trop court.');
    const status = ['live', 'soon', 'off'].includes(body.status) ? body.status : (existing?.status || 'live');
    const url = String(body.url ?? existing?.url ?? '').trim().slice(0, 300);
    if (url && !/^https?:\/\//.test(url)) throw new ApiError('L’URL commence par http(s)://.');
    const emoji = validateAvatar(body.emoji ?? existing?.emoji, '🎮');
    if (emoji === null) throw new ApiError('L’icone est un emoji.');
    const color = String(body.color ?? existing?.color ?? '#8b5cf6').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new ApiError('Couleur au format #rrggbb.');
    let modes = body.modes ?? existing?.modes ?? [];
    if (typeof modes === 'string') { try { modes = JSON.parse(modes); } catch { throw new ApiError('modes : JSON invalide.'); } }
    if (!Array.isArray(modes)) throw new ApiError('modes : tableau attendu.');
    modes = modes.map((m) => {
      if (!m || typeof m !== 'object' || !/^[a-z0-9_-]{1,32}$/.test(String(m.id || ''))) throw new ApiError('Chaque mode a un id (minuscules, chiffres, - ou _).');
      return {
        id: m.id, label: String(m.label || m.id).slice(0, 40), emoji: String(m.emoji || '🎵').slice(0, 8),
        period: ['daily', 'weekly', 'none'].includes(m.period) ? m.period : 'daily',
        metric: challenges.METRICS.includes(m.metric) ? m.metric : 'best_score',
        description: String(m.description || '').slice(0, 300),
      };
    });
    return {
      slug, name, tagline: String(body.tagline ?? existing?.tagline ?? '').slice(0, 120),
      description: String(body.description ?? existing?.description ?? '').slice(0, 1000),
      emoji, color, url, status, modes: JSON.stringify(modes), sort: Number(body.sort ?? existing?.sort ?? 0) || 0,
    };
  };

  app.post('/api/admin/games', guard((req, res) => {
    auth.requireAdmin(req);
    const input = gameInput(req.body || {}, null);
    if (repo.gameBySlug(input.slug)) throw new ApiError('Ce slug existe deja.', 409);
    const now = Date.now();
    const game = repo.insertGame({ ...input, createdAt: now, updatedAt: now });
    challenges.ensureAll();
    res.status(201).json({ game: gameView(game) });
  }));

  app.patch('/api/admin/games/:slug', guard((req, res) => {
    auth.requireAdmin(req);
    const existing = repo.gameBySlug(req.params.slug);
    if (!existing) throw new ApiError('Jeu inconnu.', 404);
    repo.updateGame({ ...gameInput(req.body || {}, existing), updatedAt: Date.now() });
    challenges.ensureAll();
    res.json({ game: gameView(repo.gameBySlug(existing.slug)) });
  }));

  app.delete('/api/admin/games/:slug', guard((req, res) => {
    auth.requireAdmin(req);
    if (!repo.gameBySlug(req.params.slug)) throw new ApiError('Jeu inconnu.', 404);
    repo.deleteGame(req.params.slug);
    res.json({ ok: true });
  }));

  /** Nouvelle cle d'ingestion : rendue en clair une seule fois, seul le hachage est garde. */
  app.post('/api/admin/games/:slug/key', guard((req, res) => {
    auth.requireAdmin(req);
    const game = repo.gameBySlug(req.params.slug);
    if (!game) throw new ApiError('Jeu inconnu.', 404);
    const key = `pk_${game.slug}_${newToken().slice(0, 40)}`;
    repo.setGameKey(game.slug, sha256(key));
    res.json({ key });
  }));

  app.post('/api/admin/challenges', guard((req, res) => {
    const admin = auth.requireAdmin(req);
    const ch = challenges.createCustom(req.body || {}, admin.id);
    res.status(201).json({ challenge: challengeView(ch, { withSeed: true }) });
  }));

  app.delete('/api/admin/challenges/:id', guard((req, res) => {
    auth.requireAdmin(req);
    if (!repo.challengeById(req.params.id)) throw new ApiError('Defi inconnu.', 404);
    repo.deleteChallenge(req.params.id);
    res.json({ ok: true });
  }));

  app.post('/api/admin/challenges/run', guard((req, res) => {
    auth.requireAdmin(req);
    const created = challenges.ensureAll();
    const closed = challenges.closeEnded();
    res.json({ created: created.length, closed: closed.length });
  }));

  app.patch('/api/admin/users/:id/role', guard((req, res) => {
    const admin = auth.requireAdmin(req);
    const target = repo.userById(req.params.id);
    if (!target) throw new ApiError('Joueur inconnu.', 404);
    if (target.id === admin.id) throw new ApiError('On ne change pas son propre role.');
    const role = req.body?.role === 'admin' ? 'admin' : 'player';
    repo.setRole(target.id, role);
    res.json({ user: repo.publicUser(repo.userById(target.id)) });
  }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue.' }));
}

module.exports = { register, matchView, challengeView, ladderView };

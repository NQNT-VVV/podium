'use strict';

/**
 * Tout le SQL de l'application. Le metier manipule des objets camelCase et
 * ignore qu'il y a une base dessous.
 */

const db = require('./db');
const { json } = require('./util');

/* ------------------------------------------------------------------ */
/* Traduction                                                         */
/* ------------------------------------------------------------------ */

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id, pseudo: row.pseudo, pseudoNorm: row.pseudo_norm, avatar: row.avatar,
    hasPassword: !!row.password_hash, passwordHash: row.password_hash,
    discordId: row.discord_id, discordName: row.discord_name,
    role: row.role, createdAt: row.created_at, lastSeenAt: row.last_seen_at,
  };
}

/** Ce qu'on montre de quelqu'un a tout le monde. */
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, pseudo: u.pseudo, avatar: u.avatar, role: u.role, createdAt: u.createdAt };
}

function toGame(row) {
  if (!row) return null;
  return {
    slug: row.slug, name: row.name, tagline: row.tagline, description: row.description,
    emoji: row.emoji, color: row.color, url: row.url, status: row.status,
    modes: json(row.modes, []), hasKey: !!row.ingest_key_hash, ingestKeyHash: row.ingest_key_hash,
    sort: row.sort, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function publicGame(g) {
  if (!g) return null;
  const { ingestKeyHash, ...rest } = g;
  return rest;
}

function toChallenge(row) {
  if (!row) return null;
  return {
    id: row.id, slug: row.slug, gameSlug: row.game_slug, title: row.title, description: row.description,
    emoji: row.emoji, kind: row.kind, mode: row.mode, metric: row.metric, seed: row.seed,
    params: json(row.params, {}), period: row.period, startsAt: row.starts_at, endsAt: row.ends_at,
    closedAt: row.closed_at, createdBy: row.created_by, createdAt: row.created_at,
  };
}

function toMatch(row) {
  if (!row) return null;
  return {
    id: row.id, gameSlug: row.game_slug, externalId: row.external_id, mode: row.mode,
    challengeId: row.challenge_id, playedAt: row.played_at, durationS: row.duration_s,
    playersCount: row.players_count, rated: !!row.rated, meta: json(row.meta, {}), receivedAt: row.received_at,
  };
}

function toMatchPlayer(row) {
  return {
    matchId: row.match_id, position: row.position, userId: row.user_id, nickname: row.nickname,
    avatar: row.avatar, score: row.score, rank: row.rank, ratingBefore: row.rating_before,
    ratingAfter: row.rating_after, points: row.points,
    pseudo: row.pseudo ?? null, userAvatar: row.user_avatar ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Utilisateurs                                                       */
/* ------------------------------------------------------------------ */

const q = {
  userById: db.prepare('SELECT * FROM user WHERE id = ?'),
  userByNorm: db.prepare('SELECT * FROM user WHERE pseudo_norm = ?'),
  userByDiscord: db.prepare('SELECT * FROM user WHERE discord_id = ?'),
  userCount: db.prepare('SELECT COUNT(*) AS n FROM user'),
  insertUser: db.prepare(`INSERT INTO user (id, pseudo, pseudo_norm, avatar, password_hash, discord_id, discord_name, role, created_at, last_seen_at)
    VALUES (@id, @pseudo, @pseudoNorm, @avatar, @passwordHash, @discordId, @discordName, @role, @createdAt, @lastSeenAt)`),
  touchUser: db.prepare('UPDATE user SET last_seen_at = ? WHERE id = ?'),
  updateUser: db.prepare('UPDATE user SET pseudo = @pseudo, pseudo_norm = @pseudoNorm, avatar = @avatar WHERE id = @id'),
  setPassword: db.prepare('UPDATE user SET password_hash = ? WHERE id = ?'),
  linkDiscord: db.prepare('UPDATE user SET discord_id = ?, discord_name = ? WHERE id = ?'),
  setRole: db.prepare('UPDATE user SET role = ? WHERE id = ?'),
  searchUsers: db.prepare('SELECT * FROM user WHERE pseudo_norm LIKE ? ORDER BY pseudo LIMIT 10'),

  insertSession: db.prepare('INSERT INTO session (id, user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?, ?)'),
  sessionById: db.prepare('SELECT * FROM session WHERE id = ? AND expires_at > ?'),
  deleteSession: db.prepare('DELETE FROM session WHERE id = ?'),
  deleteUserSessions: db.prepare('DELETE FROM session WHERE user_id = ?'),
  purgeSessions: db.prepare('DELETE FROM session WHERE expires_at <= ?'),

  games: db.prepare('SELECT * FROM game ORDER BY sort, name'),
  gameBySlug: db.prepare('SELECT * FROM game WHERE slug = ?'),
  insertGame: db.prepare(`INSERT INTO game (slug, name, tagline, description, emoji, color, url, status, modes, sort, created_at, updated_at)
    VALUES (@slug, @name, @tagline, @description, @emoji, @color, @url, @status, @modes, @sort, @createdAt, @updatedAt)`),
  updateGame: db.prepare(`UPDATE game SET name = @name, tagline = @tagline, description = @description, emoji = @emoji, color = @color,
    url = @url, status = @status, modes = @modes, sort = @sort, updated_at = @updatedAt WHERE slug = @slug`),
  setGameKey: db.prepare('UPDATE game SET ingest_key_hash = ?, updated_at = ? WHERE slug = ?'),
  deleteGame: db.prepare('DELETE FROM game WHERE slug = ?'),

  matchById: db.prepare('SELECT * FROM match WHERE id = ?'),
  insertMatch: db.prepare(`INSERT INTO match (id, game_slug, external_id, mode, challenge_id, played_at, duration_s, players_count, rated, meta, received_at)
    VALUES (@id, @gameSlug, @externalId, @mode, @challengeId, @playedAt, @durationS, @playersCount, @rated, @meta, @receivedAt)`),
  insertMatchPlayer: db.prepare(`INSERT INTO match_player (match_id, position, user_id, nickname, avatar, score, rank, rating_before, rating_after, points)
    VALUES (@matchId, @position, @userId, @nickname, @avatar, @score, @rank, @ratingBefore, @ratingAfter, @points)`),
  matchPlayers: db.prepare(`SELECT mp.*, u.pseudo AS pseudo, u.avatar AS user_avatar FROM match_player mp
    LEFT JOIN user u ON u.id = mp.user_id WHERE mp.match_id = ? ORDER BY mp.rank, mp.position`),
  recentMatches: db.prepare('SELECT * FROM match ORDER BY played_at DESC LIMIT ?'),
  recentGameMatches: db.prepare('SELECT * FROM match WHERE game_slug = ? ORDER BY played_at DESC LIMIT ?'),
  userMatches: db.prepare(`SELECT m.*, mp.position, mp.score, mp.rank, mp.rating_before, mp.rating_after, mp.points
    FROM match_player mp JOIN match m ON m.id = mp.match_id WHERE mp.user_id = ? ORDER BY m.played_at DESC LIMIT ?`),
  userGameHistory: db.prepare(`SELECT m.played_at, mp.rating_after FROM match_player mp JOIN match m ON m.id = mp.match_id
    WHERE mp.user_id = ? AND m.game_slug = ? AND mp.rating_after IS NOT NULL ORDER BY m.played_at DESC LIMIT ?`),
  countMatches: db.prepare('SELECT COUNT(*) AS n FROM match'),
  countMatchesSince: db.prepare('SELECT COUNT(*) AS n FROM match WHERE played_at >= ?'),
  countGameMatches: db.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT mp.user_id) AS players FROM match m LEFT JOIN match_player mp ON mp.match_id = m.id WHERE m.game_slug = ?'),

  rating: db.prepare('SELECT * FROM rating WHERE user_id = ? AND game_slug = ?'),
  upsertRating: db.prepare(`INSERT INTO rating (user_id, game_slug, rating, matches, wins, podiums, peak, updated_at)
    VALUES (@userId, @gameSlug, @rating, @matches, @wins, @podiums, @peak, @updatedAt)
    ON CONFLICT(user_id, game_slug) DO UPDATE SET rating = excluded.rating, matches = excluded.matches, wins = excluded.wins,
      podiums = excluded.podiums, peak = excluded.peak, updated_at = excluded.updated_at`),
  userRatings: db.prepare('SELECT r.*, g.name AS game_name, g.emoji AS game_emoji FROM rating r JOIN game g ON g.slug = r.game_slug WHERE r.user_id = ? ORDER BY r.rating DESC'),
  gameLadder: db.prepare(`SELECT r.*, u.pseudo, u.avatar FROM rating r JOIN user u ON u.id = r.user_id
    WHERE r.game_slug = ? ORDER BY (r.matches >= @placement) DESC, r.rating DESC, r.matches DESC LIMIT @limit`),
  gameRankOf: db.prepare(`SELECT COUNT(*) + 1 AS pos FROM rating WHERE game_slug = @gameSlug AND matches >= @placement AND rating > @rating`),

  seasonLadder: db.prepare(`SELECT u.id, u.pseudo, u.avatar, SUM(mp.points) AS points, COUNT(*) AS matches,
      SUM(CASE WHEN mp.rank = 1 AND m.players_count >= 2 THEN 1 ELSE 0 END) AS wins,
      COUNT(DISTINCT m.game_slug) AS games
    FROM match_player mp JOIN match m ON m.id = mp.match_id JOIN user u ON u.id = mp.user_id
    WHERE m.played_at BETWEEN @start AND @end
    GROUP BY u.id HAVING points > 0 ORDER BY points DESC, wins DESC, matches ASC LIMIT @limit`),
  seasonGameLadder: db.prepare(`SELECT u.id, u.pseudo, u.avatar, SUM(mp.points) AS points, COUNT(*) AS matches,
      SUM(CASE WHEN mp.rank = 1 AND m.players_count >= 2 THEN 1 ELSE 0 END) AS wins, 1 AS games
    FROM match_player mp JOIN match m ON m.id = mp.match_id JOIN user u ON u.id = mp.user_id
    WHERE m.played_at BETWEEN @start AND @end AND m.game_slug = @gameSlug
    GROUP BY u.id HAVING points > 0 ORDER BY points DESC, wins DESC, matches ASC LIMIT @limit`),
  userSeason: db.prepare(`SELECT SUM(mp.points) AS points, COUNT(*) AS matches,
      SUM(CASE WHEN mp.rank = 1 AND m.players_count >= 2 THEN 1 ELSE 0 END) AS wins
    FROM match_player mp JOIN match m ON m.id = mp.match_id WHERE mp.user_id = @userId AND m.played_at BETWEEN @start AND @end`),
  userSeasonRank: db.prepare(`SELECT COUNT(*) + 1 AS pos FROM (
      SELECT mp.user_id, SUM(mp.points) AS points FROM match_player mp JOIN match m ON m.id = mp.match_id
      WHERE mp.user_id IS NOT NULL AND m.played_at BETWEEN @start AND @end GROUP BY mp.user_id
    ) WHERE points > @points`),
  seasonKeys: db.prepare('SELECT MIN(played_at) AS first, MAX(played_at) AS last FROM match'),

  challengeById: db.prepare('SELECT * FROM challenge WHERE id = ?'),
  challengeBySlug: db.prepare('SELECT * FROM challenge WHERE slug = ?'),
  insertChallenge: db.prepare(`INSERT INTO challenge (id, slug, game_slug, title, description, emoji, kind, mode, metric, seed, params, period, starts_at, ends_at, created_by, created_at)
    VALUES (@id, @slug, @gameSlug, @title, @description, @emoji, @kind, @mode, @metric, @seed, @params, @period, @startsAt, @endsAt, @createdBy, @createdAt)`),
  updateChallenge: db.prepare(`UPDATE challenge SET title = @title, description = @description, emoji = @emoji, starts_at = @startsAt, ends_at = @endsAt, params = @params WHERE id = @id`),
  deleteChallenge: db.prepare('DELETE FROM challenge WHERE id = ?'),
  activeChallenges: db.prepare('SELECT * FROM challenge WHERE starts_at <= ? AND ends_at >= ? ORDER BY game_slug IS NOT NULL, period, starts_at'),
  activeGameChallenges: db.prepare('SELECT * FROM challenge WHERE (game_slug = ? OR game_slug IS NULL) AND starts_at <= ? AND ends_at >= ? ORDER BY period, starts_at'),
  upcomingChallenges: db.prepare('SELECT * FROM challenge WHERE starts_at > ? ORDER BY starts_at LIMIT ?'),
  pastChallenges: db.prepare('SELECT * FROM challenge WHERE ends_at < ? ORDER BY ends_at DESC LIMIT ?'),
  toClose: db.prepare('SELECT * FROM challenge WHERE ends_at < ? AND closed_at IS NULL'),
  closeChallenge: db.prepare('UPDATE challenge SET closed_at = ? WHERE id = ?'),

  insertBadge: db.prepare('INSERT INTO badge (user_id, kind, label, emoji, challenge_id, game_slug, awarded_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  userBadges: db.prepare('SELECT b.*, c.slug AS challenge_slug FROM badge b LEFT JOIN challenge c ON c.id = b.challenge_id WHERE b.user_id = ? ORDER BY b.awarded_at DESC'),
  challengeBadges: db.prepare('SELECT b.*, u.pseudo, u.avatar FROM badge b JOIN user u ON u.id = b.user_id WHERE b.challenge_id = ? ORDER BY b.id'),

  insertLog: db.prepare('INSERT INTO ingest_log (game_slug, external_id, status, detail, at) VALUES (?, ?, ?, ?, ?)'),
  recentLogs: db.prepare('SELECT * FROM ingest_log ORDER BY id DESC LIMIT ?'),
  purgeLogs: db.prepare('DELETE FROM ingest_log WHERE at < ?'),
};

/* ------------------------------------------------------------------ */
/* Defis : classement calcule a la volee                              */
/* ------------------------------------------------------------------ */

const METRIC_SQL = {
  wins: 'SUM(CASE WHEN mp.rank = 1 AND m.players_count >= 2 THEN 1 ELSE 0 END)',
  podiums: 'SUM(CASE WHEN mp.rank <= 3 AND m.players_count >= 2 THEN 1 ELSE 0 END)',
  matches: 'COUNT(*)',
  points: 'SUM(mp.points)',
  best_score: 'MAX(mp.score)',
  score_sum: 'SUM(mp.score)',
};

const boardCache = new Map();

/**
 * Classement d'un defi. Les filtres sont composes selon le defi : jeu, mode,
 * et pour un defi « mode » les parties qui le referencent — ou, si le jeu
 * n'avait pas pu joindre le hub, celles du bon mode dans la fenetre.
 */
function challengeBoard(ch, limit = 50) {
  const metric = METRIC_SQL[ch.metric];
  if (!metric) return [];
  const where = ['m.played_at BETWEEN @start AND @end', 'mp.user_id IS NOT NULL'];
  const args = { start: ch.startsAt, end: ch.endsAt, limit };
  if (ch.gameSlug) { where.push('m.game_slug = @game'); args.game = ch.gameSlug; }
  const mode = ch.kind === 'mode' ? ch.mode : ch.params?.mode;
  if (ch.kind === 'mode') {
    where.push('(m.challenge_id = @chId OR (m.challenge_id IS NULL AND m.mode = @mode))');
    args.chId = ch.id; args.mode = mode;
  } else if (mode) {
    where.push('m.mode = @mode'); args.mode = mode;
  }
  if (ch.params?.minPlayers) { where.push('m.players_count >= @minPlayers'); args.minPlayers = Number(ch.params.minPlayers); }
  const sql = `SELECT u.id, u.pseudo, u.avatar, ${metric} AS value, COUNT(*) AS matches, MAX(m.played_at) AS last_at
    FROM match_player mp JOIN match m ON m.id = mp.match_id JOIN user u ON u.id = mp.user_id
    WHERE ${where.join(' AND ')} GROUP BY u.id HAVING value > 0 ORDER BY value DESC, last_at ASC LIMIT @limit`;
  let stmt = boardCache.get(sql);
  if (!stmt) { stmt = db.prepare(sql); boardCache.set(sql, stmt); }
  return stmt.all(args).map((r, i) => ({ pos: i + 1, userId: r.id, pseudo: r.pseudo, avatar: r.avatar, value: r.value, matches: r.matches, lastAt: r.last_at }));
}

/* ------------------------------------------------------------------ */
/* API du depot                                                       */
/* ------------------------------------------------------------------ */

module.exports = {
  db,
  transaction: (fn) => db.transaction(fn),
  publicUser, publicGame,

  // utilisateurs
  userById: (id) => toUser(q.userById.get(id)),
  userByNorm: (norm) => toUser(q.userByNorm.get(norm)),
  userByDiscord: (id) => toUser(q.userByDiscord.get(id)),
  userCount: () => q.userCount.get().n,
  insertUser: (u) => { q.insertUser.run(u); return toUser(q.userById.get(u.id)); },
  touchUser: (id, at = Date.now()) => q.touchUser.run(at, id),
  updateUser: (u) => q.updateUser.run(u),
  setPassword: (id, hash) => q.setPassword.run(hash, id),
  linkDiscord: (id, discordId, name) => q.linkDiscord.run(discordId, name, id),
  setRole: (id, role) => q.setRole.run(role, id),
  searchUsers: (norm) => q.searchUsers.all(`${norm}%`).map(toUser),

  // sessions
  insertSession: (id, userId, createdAt, expiresAt, agent) => q.insertSession.run(id, userId, createdAt, expiresAt, agent),
  sessionById: (id, now = Date.now()) => q.sessionById.get(id, now) || null,
  deleteSession: (id) => q.deleteSession.run(id),
  deleteUserSessions: (userId) => q.deleteUserSessions.run(userId),
  purgeSessions: (now = Date.now()) => q.purgeSessions.run(now),

  // jeux
  games: () => q.games.all().map(toGame),
  gameBySlug: (slug) => toGame(q.gameBySlug.get(slug)),
  insertGame: (g) => { q.insertGame.run(g); return toGame(q.gameBySlug.get(g.slug)); },
  updateGame: (g) => q.updateGame.run(g),
  setGameKey: (slug, hash) => q.setGameKey.run(hash, Date.now(), slug),
  deleteGame: (slug) => q.deleteGame.run(slug),

  // parties
  matchById: (id) => toMatch(q.matchById.get(id)),
  insertMatch: (m) => q.insertMatch.run(m),
  insertMatchPlayer: (p) => q.insertMatchPlayer.run(p),
  matchPlayers: (matchId) => q.matchPlayers.all(matchId).map(toMatchPlayer),
  recentMatches: (limit = 20) => q.recentMatches.all(limit).map(toMatch),
  recentGameMatches: (slug, limit = 20) => q.recentGameMatches.all(slug, limit).map(toMatch),
  userMatches: (userId, limit = 20) => q.userMatches.all(userId, limit).map((r) => ({
    ...toMatch(r), position: r.position, score: r.score, rank: r.rank, ratingBefore: r.rating_before, ratingAfter: r.rating_after, points: r.points,
  })),
  userGameHistory: (userId, slug, limit = 30) => q.userGameHistory.all(userId, slug, limit).reverse().map((r) => ({ at: r.played_at, rating: r.rating_after })),
  countMatches: () => q.countMatches.get().n,
  countMatchesSince: (since) => q.countMatchesSince.get(since).n,
  gameStats: (slug) => { const r = q.countGameMatches.get(slug); return { matches: r.n, players: r.players }; },

  // cotes
  rating: (userId, slug) => q.rating.get(userId, slug) || null,
  upsertRating: (r) => q.upsertRating.run(r),
  userRatings: (userId) => q.userRatings.all(userId),
  gameLadder: (slug, limit, placement) => q.gameLadder.all(slug, { limit, placement }),
  gameRankOf: (gameSlug, rating, placement) => q.gameRankOf.get({ gameSlug, rating, placement }).pos,

  // saison
  seasonLadder: (start, end, limit = 100) => q.seasonLadder.all({ start, end, limit }),
  seasonGameLadder: (gameSlug, start, end, limit = 100) => q.seasonGameLadder.all({ gameSlug, start, end, limit }),
  userSeason: (userId, start, end) => q.userSeason.get({ userId, start, end }),
  userSeasonRank: (points, start, end) => q.userSeasonRank.get({ points, start, end }).pos,
  matchBounds: () => q.seasonKeys.get(),

  // defis
  challengeById: (id) => toChallenge(q.challengeById.get(id)),
  challengeBySlug: (slug) => toChallenge(q.challengeBySlug.get(slug)),
  insertChallenge: (c) => { q.insertChallenge.run(c); return toChallenge(q.challengeById.get(c.id)); },
  updateChallenge: (c) => q.updateChallenge.run(c),
  deleteChallenge: (id) => q.deleteChallenge.run(id),
  activeChallenges: (now = Date.now()) => q.activeChallenges.all(now, now).map(toChallenge),
  activeGameChallenges: (slug, now = Date.now()) => q.activeGameChallenges.all(slug, now, now).map(toChallenge),
  upcomingChallenges: (now = Date.now(), limit = 20) => q.upcomingChallenges.all(now, limit).map(toChallenge),
  pastChallenges: (now = Date.now(), limit = 30) => q.pastChallenges.all(now, limit).map(toChallenge),
  challengesToClose: (now = Date.now()) => q.toClose.all(now).map(toChallenge),
  closeChallenge: (id, at = Date.now()) => q.closeChallenge.run(at, id),
  challengeBoard,

  // badges
  insertBadge: (userId, kind, label, emoji, challengeId, gameSlug, at = Date.now()) => q.insertBadge.run(userId, kind, label, emoji, challengeId, gameSlug, at),
  userBadges: (userId) => q.userBadges.all(userId).map((b) => ({
    id: b.id, kind: b.kind, label: b.label, emoji: b.emoji, challengeId: b.challenge_id, challengeSlug: b.challenge_slug, gameSlug: b.game_slug, awardedAt: b.awarded_at,
  })),
  challengeBadges: (id) => q.challengeBadges.all(id).map((b) => ({ userId: b.user_id, pseudo: b.pseudo, avatar: b.avatar, kind: b.kind, emoji: b.emoji, label: b.label })),

  // journal
  log: (gameSlug, externalId, status, detail = null) => q.insertLog.run(gameSlug, externalId, status, detail, Date.now()),
  recentLogs: (limit = 50) => q.recentLogs.all(limit),
  purgeLogs: (before) => q.purgeLogs.run(before),
};

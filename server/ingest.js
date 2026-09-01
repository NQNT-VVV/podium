'use strict';

/**
 * Reception d'un classement envoye par un jeu.
 *
 * Valide, enregistre, met a jour l'Elo et les points de saison, en une seule
 * transaction. Idempotent sur (jeu, matchId) : un jeu qui reessaie apres un
 * timeout ne cree pas de doublon.
 */

const config = require('./config');
const repo = require('./repo');
const rating = require('./rating');
const { sha256, safeEqual, ApiError, validateAvatar } = require('./util');

function authenticate(game, header) {
  const m = /^Bearer\s+(.+)$/i.exec(String(header || ''));
  if (!m || !game.ingestKeyHash) throw new ApiError('Cle d’ingestion invalide.', 401);
  if (!safeEqual(sha256(m[1].trim()), game.ingestKeyHash)) throw new ApiError('Cle d’ingestion invalide.', 401);
}

function validate(body) {
  if (!body || typeof body !== 'object') throw new ApiError('Corps JSON attendu.', 422);
  const matchId = String(body.matchId || '').trim();
  if (!matchId || matchId.length > 120) throw new ApiError('matchId manquant ou trop long.', 422);
  const mode = String(body.mode || 'classic').toLowerCase().trim().slice(0, 32);
  if (!/^[a-z0-9_-]+$/.test(mode)) throw new ApiError('mode : lettres minuscules, chiffres, - ou _.', 422);
  const playedAt = Number(body.playedAt) || Date.now();
  const durationS = body.durationS === undefined || body.durationS === null ? null : Math.max(0, Math.trunc(Number(body.durationS) || 0));
  if (!Array.isArray(body.players) || body.players.length === 0) throw new ApiError('players : au moins un joueur.', 422);
  if (body.players.length > config.limits.maxPlayersPerMatch) throw new ApiError('players : trop de joueurs.', 422);
  const players = body.players.map((p, i) => {
    if (!p || typeof p !== 'object') throw new ApiError(`players[${i}] : objet attendu.`, 422);
    const nickname = String(p.nickname || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!nickname) throw new ApiError(`players[${i}] : nickname manquant.`, 422);
    const score = Number(p.score);
    if (!Number.isFinite(score)) throw new ApiError(`players[${i}] : score numerique attendu.`, 422);
    const rank = Math.trunc(Number(p.rank));
    if (!Number.isFinite(rank) || rank < 1) throw new ApiError(`players[${i}] : rank entier >= 1 attendu.`, 422);
    const pid = p.pid === null || p.pid === undefined || p.pid === '' ? null : String(p.pid).slice(0, 64);
    return { pid, nickname, avatar: validateAvatar(p.avatar, '') ?? '', score, rank };
  });
  let meta = null;
  if (body.meta && typeof body.meta === 'object') {
    meta = JSON.stringify(body.meta);
    if (meta.length > 4096) throw new ApiError('meta : 4 Ko maximum.', 422);
  }
  const challengeId = body.challengeId ? String(body.challengeId).slice(0, 64) : null;
  return { matchId, mode, playedAt, durationS, players, meta, challengeId };
}

/**
 * Enregistre la partie. Rend { duplicate, match, ratings }.
 */
function ingest(game, body) {
  const input = validate(body);
  const id = `${game.slug}:${input.matchId}`;
  const existing = repo.matchById(id);
  if (existing) {
    repo.log(game.slug, input.matchId, 'duplicate');
    return { duplicate: true, match: existing, ratings: [] };
  }

  // Un defi n'est retenu que s'il appartient a ce jeu et couvre la partie.
  let challengeId = null;
  if (input.challengeId) {
    const ch = repo.challengeById(input.challengeId);
    if (ch && ch.gameSlug === game.slug && ch.kind === 'mode' && input.playedAt >= ch.startsAt && input.playedAt <= ch.endsAt + 3600000) {
      challengeId = ch.id;
    }
  }

  const now = Date.now();
  const result = repo.transaction(() => {
    // Identites : un pid inconnu vaut un invite. Un meme compte deux fois dans
    // la meme partie (deux telephones) ne compte qu'une fois pour l'Elo.
    const seen = new Set();
    const players = input.players.map((p, i) => {
      const user = p.pid ? repo.userById(p.pid) : null;
      const rated = !!user && !seen.has(user.id);
      if (user) seen.add(user.id);
      const r = user ? repo.rating(user.id, game.slug) : null;
      return {
        ...p, position: i, user, rated,
        current: r ? r.rating : config.rating.start, matches: r ? r.matches : 0, wins: r ? r.wins : 0, podiums: r ? r.podiums : 0, peak: r ? r.peak : config.rating.start,
      };
    });

    const n = players.length;
    const isRated = n >= 2 && players.some((p) => p.rated);
    const deltas = isRated
      ? rating.rateMatch(players.map((p) => ({ id: p.position, rating: p.current, matches: p.matches, rank: p.rank, rated: p.rated })))
      : [];
    const byPos = new Map(deltas.map((d) => [d.id, d]));

    repo.insertMatch({
      id, gameSlug: game.slug, externalId: input.matchId, mode: input.mode, challengeId, playedAt: input.playedAt,
      durationS: input.durationS, playersCount: n, rated: isRated ? 1 : 0, meta: input.meta, receivedAt: now,
    });

    const ratings = [];
    for (const p of players) {
      const d = byPos.get(p.position) || null;
      const points = p.user ? rating.seasonPoints(p.rank, n) : 0;
      repo.insertMatchPlayer({
        matchId: id, position: p.position, userId: p.user ? p.user.id : null, nickname: p.nickname, avatar: p.avatar || (p.user ? p.user.avatar : ''),
        score: p.score, rank: p.rank, ratingBefore: d ? d.before : null, ratingAfter: d ? d.after : null, points,
      });
      if (d) {
        const matches = p.matches + 1;
        repo.upsertRating({
          userId: p.user.id, gameSlug: game.slug, rating: d.after, matches,
          wins: p.wins + (p.rank === 1 ? 1 : 0), podiums: p.podiums + (p.rank <= 3 ? 1 : 0),
          peak: Math.max(p.peak, d.after), updatedAt: now,
        });
        ratings.push({ pid: p.user.id, before: d.before, after: d.after, delta: d.delta, tier: rating.tierOf(d.after, matches).label });
      }
      if (p.user) repo.touchUser(p.user.id, now);
    }
    return { ratings };
  })();

  repo.log(game.slug, input.matchId, 'ok', `${input.players.length} joueurs, mode ${input.mode}`);
  return { duplicate: false, match: repo.matchById(id), ratings: result.ratings };
}

module.exports = { authenticate, validate, ingest };

'use strict';

/**
 * Defis : creation automatique, cloture, recompenses.
 *
 * Deux natures :
 *   - « auto » : calcule par Podium a partir des classements recus (victoires,
 *     podiums, points, meilleur score…). Le jeu n'a rien a faire.
 *   - « mode » : le jeu implemente un mode (musique du jour, pack de la
 *     semaine) ; Podium publie la periode et une graine identique pour tous,
 *     puis classe les resultats envoyes avec l'identifiant du defi.
 */

const crypto = require('crypto');

const config = require('../config');
const repo = require('../repo');
const periods = require('../periods');
const templates = require('./templates');
const { newId } = require('../util');

const METRICS = ['wins', 'podiums', 'matches', 'points', 'best_score', 'score_sum'];
const PERIODS = ['daily', 'weekly', 'custom'];

const METRIC_LABEL = {
  wins: 'victoires', podiums: 'podiums', matches: 'parties', points: 'points', best_score: 'meilleur score', score_sum: 'score cumule',
};

function seedFor(gameSlug, mode, periodKey) {
  return crypto.createHmac('sha256', config.ssoSecret).update(`${gameSlug}:${mode}:${periodKey}`).digest('hex').slice(0, 32);
}

function createFromTemplate(tpl, gameSlug, period, now) {
  const slug = `${gameSlug || 'global'}-${period.key.toLowerCase()}-${tpl.id}`;
  if (repo.challengeBySlug(slug)) return null;
  return repo.insertChallenge({
    id: newId('ch_'), slug, gameSlug, title: tpl.title, description: tpl.description, emoji: tpl.emoji || '🎯',
    kind: 'auto', mode: tpl.params?.mode || null, metric: tpl.metric, seed: null,
    params: JSON.stringify(tpl.params || {}), period: 'weekly', startsAt: period.start, endsAt: period.end,
    createdBy: null, createdAt: now,
  });
}

function createModeChallenge(game, mode, period, now) {
  const slug = `${game.slug}-${mode.id}-${period.key.toLowerCase()}`;
  if (repo.challengeBySlug(slug)) return null;
  return repo.insertChallenge({
    id: newId('ch_'), slug, gameSlug: game.slug, title: mode.label || mode.id, description: mode.description || '',
    emoji: mode.emoji || '🎵', kind: 'mode', mode: mode.id, metric: METRICS.includes(mode.metric) ? mode.metric : 'best_score',
    seed: seedFor(game.slug, mode.id, period.key), params: JSON.stringify(mode.params || {}),
    period: mode.period === 'weekly' ? 'weekly' : 'daily', startsAt: period.start, endsAt: period.end,
    createdBy: null, createdAt: now,
  });
}

/**
 * Garantit les defis de la periode courante et de la suivante (pour qu'un
 * jeu qui met en cache cinq minutes voie le defi du lendemain arriver).
 */
function ensureAll(now = Date.now()) {
  const created = [];
  const tz = config.timeZone;
  const games = repo.games().filter((g) => g.status !== 'off');
  const weeks = [periods.weekOf(now, tz), periods.weekOf(now + 7 * 86400000, tz)];

  for (const week of weeks) {
    for (const game of games) {
      const tpl = templates.pick(templates.forGame(game.slug), week.week, templates.offsetFor(game.slug));
      if (tpl) { const c = createFromTemplate(tpl, game.slug, week, now); if (c) created.push(c); }
      for (const mode of game.modes || []) {
        if (!mode || !mode.id || mode.period === 'none') continue;
        if (mode.period === 'weekly') { const c = createModeChallenge(game, mode, week, now); if (c) created.push(c); }
      }
    }
    const tpl = templates.pick(templates.GLOBAL, week.week);
    if (tpl && games.length) { const c = createFromTemplate(tpl, null, week, now); if (c) created.push(c); }
  }

  const days = [periods.dayOf(now, tz), periods.dayOf(now + 86400000, tz)];
  for (const day of days) {
    for (const game of games) {
      for (const mode of game.modes || []) {
        if (!mode || !mode.id || (mode.period || 'daily') !== 'daily') continue;
        const c = createModeChallenge(game, mode, day, now);
        if (c) created.push(c);
      }
    }
  }
  return created;
}

const MEDALS = [
  { kind: 'gold', emoji: '🥇' },
  { kind: 'silver', emoji: '🥈' },
  { kind: 'bronze', emoji: '🥉' },
];

/** Clot les defis termines : les trois premiers recoivent un badge. */
function closeEnded(now = Date.now()) {
  const closed = [];
  for (const ch of repo.challengesToClose(now)) {
    repo.transaction(() => {
      const board = repo.challengeBoard(ch, 3);
      board.forEach((row, i) => {
        const medal = MEDALS[i];
        repo.insertBadge(row.userId, medal.kind, `${ch.title} — ${periodLabel(ch)}`, medal.emoji, ch.id, ch.gameSlug, now);
      });
      repo.closeChallenge(ch.id, now);
    })();
    closed.push(ch);
  }
  return closed;
}

function periodLabel(ch) {
  const tz = config.timeZone;
  if (ch.period === 'daily') return periods.dayOf(ch.startsAt + 12 * 3600000, tz).label;
  if (ch.period === 'weekly') { const w = periods.weekOf(ch.startsAt + 12 * 3600000, tz); return `semaine ${w.week}`; }
  return `${periods.dayOf(ch.startsAt, tz).label} → ${periods.dayOf(ch.endsAt, tz).label}`;
}

/** Vue publique d'un defi, telle que servie aux pages et aux jeux. */
function view(ch, { withSeed = false, now = Date.now() } = {}) {
  const state = ch.endsAt < now ? 'past' : ch.startsAt > now ? 'upcoming' : 'active';
  const out = {
    id: ch.id, slug: ch.slug, gameSlug: ch.gameSlug, title: ch.title, description: ch.description, emoji: ch.emoji,
    kind: ch.kind, mode: ch.mode, metric: ch.metric, metricLabel: METRIC_LABEL[ch.metric] || ch.metric,
    params: ch.params, period: ch.period, periodLabel: periodLabel(ch), startsAt: ch.startsAt, endsAt: ch.endsAt,
    closedAt: ch.closedAt, state,
  };
  if (withSeed) out.seed = ch.seed;
  return out;
}

/** Creation manuelle depuis l'admin. */
function createCustom(input, userId) {
  const now = Date.now();
  const title = String(input.title || '').trim().slice(0, 80);
  if (title.length < 2) throw Object.assign(new Error('Titre trop court.'), { status: 400, expected: true });
  const metric = METRICS.includes(input.metric) ? input.metric : 'wins';
  const kind = input.kind === 'mode' ? 'mode' : 'auto';
  const gameSlug = input.gameSlug ? String(input.gameSlug) : null;
  if (gameSlug && !repo.gameBySlug(gameSlug)) throw Object.assign(new Error('Jeu inconnu.'), { status: 404, expected: true });
  if (kind === 'mode' && !gameSlug) throw Object.assign(new Error('Un defi « mode » est lie a un jeu.'), { status: 400, expected: true });
  const startsAt = Number(input.startsAt) || now;
  const endsAt = Number(input.endsAt) || startsAt + 7 * 86400000;
  if (endsAt <= startsAt) throw Object.assign(new Error('La fin precede le debut.'), { status: 400, expected: true });
  const base = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  let slug = `${gameSlug || 'global'}-${base}`;
  for (let i = 2; repo.challengeBySlug(slug); i++) slug = `${gameSlug || 'global'}-${base}-${i}`;
  const mode = input.mode ? String(input.mode).toLowerCase().slice(0, 32) : null;
  return repo.insertChallenge({
    id: newId('ch_'), slug, gameSlug, title, description: String(input.description || '').slice(0, 500),
    emoji: String(input.emoji || '🎯').slice(0, 8), kind, mode, metric,
    seed: kind === 'mode' ? seedFor(gameSlug, mode, slug) : null,
    params: JSON.stringify(input.params && typeof input.params === 'object' ? input.params : (mode && kind === 'auto' ? { mode } : {})),
    period: PERIODS.includes(input.period) ? input.period : 'custom', startsAt, endsAt, createdBy: userId, createdAt: now,
  });
}

module.exports = { METRICS, PERIODS, METRIC_LABEL, ensureAll, closeEnded, view, periodLabel, createCustom, seedFor };

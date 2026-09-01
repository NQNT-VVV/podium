'use strict';

/**
 * Classement : Elo multijoueur, points de saison, paliers.
 *
 * Fonctions pures. Aucune base : c'est ce qui permet de verifier au test les
 * cas qui font discuter (egalite parfaite, joueur seul, invite non classe).
 */

const config = require('./config');

/**
 * Paliers. Un joueur demarre a 1000, donc en Argent : il a de la marge dans
 * les deux sens, et un debut de saison ne le colle pas au fond.
 */
const TIERS = [
  { id: 'bronze', label: 'Bronze', min: -Infinity, emoji: '🥉', color: '#cd7f32' },
  { id: 'argent', label: 'Argent', min: 950, emoji: '🥈', color: '#c0c0c0' },
  { id: 'or', label: 'Or', min: 1050, emoji: '🥇', color: '#fbbf24' },
  { id: 'platine', label: 'Platine', min: 1150, emoji: '💠', color: '#67e8f9' },
  { id: 'diamant', label: 'Diamant', min: 1250, emoji: '💎', color: '#a78bfa' },
  { id: 'legende', label: 'Legende', min: 1400, emoji: '👑', color: '#ff3d8b' },
];

function tierOf(rating, matches = Infinity) {
  if (matches < config.rating.placementMatches) {
    return { id: 'placement', label: 'Placement', emoji: '🎯', color: '#9c96bd', progress: matches / config.rating.placementMatches };
  }
  let tier = TIERS[0];
  for (const t of TIERS) if (rating >= t.min) tier = t;
  return { ...tier };
}

function kFor(matches, rating) {
  if (matches < 10) return config.rating.kPlacement;
  if (rating >= 1400) return config.rating.kHigh;
  return config.rating.k;
}

/**
 * Elo a N joueurs.
 *
 * Chaque joueur est compare a tous les autres : son score reel est sa
 * position normalisee dans le classement (1 pour le premier, 0 pour le
 * dernier, les egalites partagent), son score attendu la moyenne des
 * probabilites de victoire face a chacun. Les joueurs sans compte comptent
 * comme des adversaires a la cote de depart : ils influencent le calcul mais
 * ne sont pas mis a jour.
 *
 * @param players [{ id, rating, matches, rank, rated }] — `rated` faux pour un invite
 * @returns [{ id, before, after, delta }] pour les seuls joueurs `rated`
 */
function rateMatch(players) {
  const n = players.length;
  if (n < 2) return [];
  const results = [];
  for (const me of players) {
    if (!me.rated) continue;
    let expected = 0;
    for (const other of players) {
      if (other === me) continue;
      expected += 1 / (1 + 10 ** ((other.rating - me.rating) / 400));
    }
    expected /= n - 1;
    const actual = actualScore(me.rank, players);
    const k = kFor(me.matches, me.rating);
    const delta = Math.round(k * (actual - expected) * 10) / 10;
    results.push({ id: me.id, before: me.rating, after: Math.max(100, me.rating + delta), delta });
  }
  return results;
}

/** Position normalisee : 1 pour le premier, 0 pour le dernier. A egalite, moyenne des positions partagees. */
function actualScore(rank, players) {
  const n = players.length;
  const same = players.filter((p) => p.rank === rank).length;
  const better = players.filter((p) => p.rank < rank).length;
  // Positions occupees (0-based) : better .. better+same-1, moyenne.
  const meanPos = better + (same - 1) / 2;
  return 1 - meanPos / (n - 1);
}

/**
 * Points de saison d'une partie : de 110 pour une victoire a 10 pour une
 * derniere place, quel que soit le nombre de joueurs. Une partie seul ne
 * rapporte rien : les modes solo se jouent pour les defis, pas pour la saison.
 */
function seasonPoints(rank, n) {
  if (n < 2) return 0;
  return Math.round((100 * (n - rank)) / (n - 1)) + 10;
}

module.exports = { TIERS, tierOf, kFor, rateMatch, actualScore, seasonPoints };

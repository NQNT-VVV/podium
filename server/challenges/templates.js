'use strict';

/**
 * Gabarits de defis hebdomadaires.
 *
 * Chaque semaine, le planificateur en tire un par jeu et un global, en tournant
 * dans la liste selon le numero de semaine : deux semaines de suite ne
 * proposent pas la meme chose, et l'ordre est le meme partout (aucun tirage).
 *
 * Un gabarit par jeu s'ajoute ici ; les gabarits generiques conviennent a tout
 * jeu qui envoie des classements multijoueur.
 */

const GENERIC = [
  { id: 'victoires', emoji: '🏁', metric: 'wins', title: 'Serial gagnant', description: 'Le plus de victoires cette semaine.', params: { minPlayers: 2 } },
  { id: 'podiums', emoji: '🥉', metric: 'podiums', title: 'Habitue du podium', description: 'Le plus de top 3 cette semaine.', params: { minPlayers: 2 } },
  { id: 'points', emoji: '📈', metric: 'points', title: 'La montee', description: 'Le plus de points de saison engranges cette semaine.' },
  { id: 'assidu', emoji: '🔥', metric: 'matches', title: 'Toujours la', description: 'Le plus de parties jouees cette semaine.' },
];

const BY_GAME = {
  refrain: [
    { id: 'oreille', emoji: '👂', metric: 'best_score', title: 'Oreille absolue', description: 'Le plus gros score sur une seule partie de blind test.', params: { minPlayers: 2 } },
    { id: 'semaine-du-jour', emoji: '🎵', metric: 'score_sum', title: 'La semaine du jour', description: 'Cumul des musiques du jour de la semaine : sept matins, sept morceaux.', params: { mode: 'daily' } },
  ],
  arena: [
    { id: 'chef-d-oeuvre', emoji: '🖼️', metric: 'best_score', title: 'Chef-d’oeuvre', description: 'La meilleure note moyenne obtenue sur un rendu cette semaine.', params: { minPlayers: 2 } },
  ],
};

const GLOBAL = [
  { id: 'touche-a-tout', emoji: '🎲', metric: 'matches', title: 'Touche-a-tout', description: 'Le plus de parties, tous jeux confondus.' },
  { id: 'grand-chelem', emoji: '👑', metric: 'wins', title: 'Grand chelem', description: 'Le plus de victoires, tous jeux confondus.', params: { minPlayers: 2 } },
  { id: 'saisonnier', emoji: '🌟', metric: 'points', title: 'Etoile de la semaine', description: 'Le plus de points de saison, tous jeux confondus.' },
];

/** Gabarits d'un jeu : les siens d'abord, puis les generiques. */
function forGame(slug) {
  return [...(BY_GAME[slug] || []), ...GENERIC];
}

/** Choix stable pour une semaine : la liste tourne avec le numero de semaine et un decalage propre au jeu. */
function pick(list, week, offset = 0) {
  if (!list.length) return null;
  return list[(week + offset) % list.length];
}

function offsetFor(slug) {
  let h = 0;
  for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

module.exports = { GENERIC, BY_GAME, GLOBAL, forGame, pick, offsetFor };

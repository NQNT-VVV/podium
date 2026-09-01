'use strict';

/**
 * Catalogue initial : les jeux sont crees a la premiere ouverture de la base,
 * sans cle d'ingestion — elle se genere dans l'admin, une fois, et se copie
 * dans la configuration du jeu.
 */

const repo = require('./repo');
const seed = require('./games.seed.json');

function run() {
  if (repo.games().length) return 0;
  const now = Date.now();
  for (const g of seed) {
    repo.insertGame({
      slug: g.slug, name: g.name, tagline: g.tagline || '', description: g.description || '', emoji: g.emoji || '🎮',
      color: g.color || '#8b5cf6', url: g.url || '', status: g.status || 'live', modes: JSON.stringify(g.modes || []),
      sort: g.sort || 0, createdAt: now, updatedAt: now,
    });
  }
  return seed.length;
}

module.exports = { run };

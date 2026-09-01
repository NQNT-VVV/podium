// Verifie l'Elo multijoueur, les points de saison et les paliers, sans base.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { rateMatch, seasonPoints, tierOf, actualScore } = require('../server/rating.js');

const p = (id, rating, rank, matches = 20, rated = true) => ({ id, rating, rank, matches, rated });

// Deux joueurs de meme cote : le gagnant prend ce que le perdant perd.
{
  const r = rateMatch([p('a', 1000, 1), p('b', 1000, 2)]);
  assert.equal(r.length, 2);
  assert.ok(r[0].delta > 0 && r[1].delta < 0);
  assert.equal(Math.round(r[0].delta + r[1].delta), 0);
}

// Battre un joueur mieux cote rapporte plus que battre un plus faible.
{
  const up = rateMatch([p('a', 1000, 1), p('b', 1200, 2)])[0].delta;
  const down = rateMatch([p('a', 1000, 1), p('b', 800, 2)])[0].delta;
  assert.ok(up > down, `${up} > ${down}`);
}

// Un joueur seul : aucun changement.
assert.deepEqual(rateMatch([p('a', 1000, 1)]), []);

// Les invites ne sont pas mis a jour mais pesent sur le calcul.
{
  const r = rateMatch([p('a', 1000, 1), p('g', 1000, 2, 0, false), p('b', 1000, 3)]);
  assert.deepEqual(r.map((x) => x.id), ['a', 'b']);
  assert.ok(r[0].delta > 0 && r[1].delta < 0);
}

// Egalite parfaite a deux : personne ne bouge.
{
  const r = rateMatch([p('a', 1000, 1), p('b', 1000, 1)]);
  assert.equal(r[0].delta, 0);
  assert.equal(r[1].delta, 0);
}

// Position normalisee : premier = 1, dernier = 0, egalites partagees.
{
  const players = [p('a', 1000, 1), p('b', 1000, 2), p('c', 1000, 2), p('d', 1000, 4)];
  assert.equal(actualScore(1, players), 1);
  assert.equal(actualScore(4, players), 0);
  assert.equal(actualScore(2, players), 0.5);
}

// Le K de placement est plus genereux.
{
  const fresh = rateMatch([p('a', 1000, 1, 0), p('b', 1000, 2)])[0].delta;
  const settled = rateMatch([p('a', 1000, 1, 50), p('b', 1000, 2)])[0].delta;
  assert.ok(fresh > settled);
}

// Points de saison : de 110 a 10, rien seul.
assert.equal(seasonPoints(1, 2), 110);
assert.equal(seasonPoints(2, 2), 10);
assert.equal(seasonPoints(1, 10), 110);
assert.equal(seasonPoints(10, 10), 10);
assert.equal(seasonPoints(5, 9), 60);
assert.equal(seasonPoints(1, 1), 0);

// Paliers.
assert.equal(tierOf(1000, 0).id, 'placement');
assert.equal(tierOf(1000, 3).id, 'argent');
assert.equal(tierOf(900, 10).id, 'bronze');
assert.equal(tierOf(1100, 10).id, 'or');
assert.equal(tierOf(1450, 10).id, 'legende');

console.log('rating : OK');

// Jours, semaines ISO et mois en Europe/Paris, y compris autour des changements d'heure.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { dayOf, weekOf, monthOf, monthFromKey } = require('../server/periods.js');

const TZ = 'Europe/Paris';
const at = (iso) => new Date(iso).getTime();

// Un mardi de septembre : la semaine ISO 36 commence le lundi 31 aout a minuit Paris (22:00 UTC la veille).
{
  const w = weekOf(at('2026-09-01T12:00:00Z'), TZ);
  assert.equal(w.key, '2026-W36');
  assert.equal(new Date(w.start).toISOString(), '2026-08-30T22:00:00.000Z');
  assert.equal(new Date(w.end + 1).toISOString(), '2026-09-06T22:00:00.000Z');
}

// Le jour civil suit le fuseau : 23h30 UTC un lundi, c'est deja mardi a Paris.
{
  const d = dayOf(at('2026-08-31T23:30:00Z'), TZ);
  assert.equal(d.key, '2026-09-01');
}


// Le passage a l'heure d'hiver 2026 a lieu le dimanche 25 octobre a 3h. Le lundi 26 a minuit est donc en UTC+1.
{
  const w = weekOf(at('2026-10-27T12:00:00Z'), TZ);
  assert.equal(new Date(w.start).toISOString(), '2026-10-25T23:00:00.000Z');
  const prev = weekOf(at('2026-10-21T12:00:00Z'), TZ);
  assert.equal(new Date(prev.start).toISOString(), '2026-10-18T22:00:00.000Z');
  assert.equal(prev.end + 1, w.start);
}

// Semaine 1 de l'annee ISO : le 1er janvier 2027 est un vendredi, donc en semaine 53 de 2026.
{
  assert.equal(weekOf(at('2027-01-01T12:00:00Z'), TZ).key, '2026-W53');
  assert.equal(weekOf(at('2027-01-04T12:00:00Z'), TZ).key, '2027-W01');
}

// Mois.
{
  const m = monthOf(at('2026-09-15T12:00:00Z'), TZ);
  assert.equal(m.key, '2026-09');
  assert.equal(m.label, 'septembre 2026');
  assert.equal(new Date(m.start).toISOString(), '2026-08-31T22:00:00.000Z');
  assert.equal(new Date(m.end + 1).toISOString(), '2026-09-30T22:00:00.000Z');
  assert.equal(monthFromKey('2026-09', TZ).start, m.start);
  assert.equal(monthFromKey('nope', TZ), null);
}

console.log('periods : OK');

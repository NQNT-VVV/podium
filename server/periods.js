'use strict';

/**
 * Jours, semaines ISO et mois dans un fuseau donne, sans dependance.
 *
 * Tout est calcule en millisecondes UTC ; le fuseau ne sert qu'a decider ou
 * tombe minuit. Les fonctions sont pures : elles se testent sans base ni
 * horloge.
 */

const fmtCache = new Map();
function formatter(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }));
  }
  return fmtCache.get(tz);
}

const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Composantes locales d'un instant. */
function parts(ms, tz) {
  const p = Object.fromEntries(formatter(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    h: Number(p.hour), mi: Number(p.minute), s: Number(p.second),
    wd: WEEKDAYS[p.weekday] ?? 1,
  };
}

/** Decalage du fuseau a cet instant, en minutes (positif a l'est d'UTC). */
function offsetMin(ms, tz) {
  const p = parts(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** Minuit local du jour civil (y, m, d), en ms UTC. Deux passes pour absorber un changement d'heure. */
function localMidnight(y, m, d, tz) {
  const naive = Date.UTC(y, m - 1, d);
  let guess = naive - offsetMin(naive, tz) * 60000;
  guess = naive - offsetMin(guess, tz) * 60000;
  return guess;
}

/**
 * Instant UTC d'une heure murale dans un fuseau.
 *
 * Meme double passe que `localMidnight`, pour la meme raison : le decalage se
 * lit a un instant, et l'instant depend du decalage. Sert a comprendre une
 * date saisie a la main — « le 12 a 14 h » veut dire 14 h la-bas, pas 14 h
 * dans le navigateur de qui l'a tapee.
 */
function localInstant(y, m, d, h = 0, mi = 0, tz = 'UTC') {
  const naive = Date.UTC(y, m - 1, d, h, mi);
  let guess = naive - offsetMin(naive, tz) * 60000;
  guess = naive - offsetMin(guess, tz) * 60000;
  return guess;
}

/**
 * Lit une saisie « AAAA-MM-JJTHH:MM » dans le fuseau donne.
 *
 * Rend null si la chaine n'a pas cette forme : l'appelant decide alors quoi
 * faire, plutot que de recevoir une date silencieusement fausse.
 */
function parseLocal(raw, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(raw || '').trim());
  if (!m) return null;
  return localInstant(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), tz);
}

const pad = (n) => String(n).padStart(2, '0');

function dayOf(ms, tz) {
  const p = parts(ms, tz);
  const start = localMidnight(p.y, p.m, p.d, tz);
  const end = localMidnight(p.y, p.m, p.d + 1, tz) - 1;
  return { key: `${p.y}-${pad(p.m)}-${pad(p.d)}`, start, end, label: `${pad(p.d)}/${pad(p.m)}/${p.y}` };
}

/** Semaine ISO : du lundi 00:00 au dimanche 23:59:59.999. */
function weekOf(ms, tz) {
  const p = parts(ms, tz);
  const monday = localMidnight(p.y, p.m, p.d - (p.wd - 1), tz);
  const end = localMidnight(p.y, p.m, p.d - (p.wd - 1) + 7, tz) - 1;
  // Numero ISO : l'annee est celle du jeudi de la semaine.
  const thu = parts(monday + 3 * 86400000 + 12 * 3600000, tz);
  const jan4 = localMidnight(thu.y, 1, 4, tz);
  const jan4wd = parts(jan4 + 12 * 3600000, tz).wd;
  const week1Monday = localMidnight(thu.y, 1, 4 - (jan4wd - 1), tz);
  const week = Math.round((monday - week1Monday) / (7 * 86400000)) + 1;
  return { key: `${thu.y}-W${pad(week)}`, start: monday, end, week, year: thu.y, label: `Semaine ${week}` };
}

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

function monthOf(ms, tz) {
  const p = parts(ms, tz);
  const start = localMidnight(p.y, p.m, 1, tz);
  const end = localMidnight(p.y, p.m + 1, 1, tz) - 1;
  return { key: `${p.y}-${pad(p.m)}`, start, end, label: `${MONTHS[p.m - 1]} ${p.y}` };
}

/** Mois a partir de sa cle « 2026-09 ». Null si la cle est mal formee. */
function monthFromKey(key, tz) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return monthOf(localMidnight(y, mo, 1, tz) + 12 * 3600000, tz);
}

function periodOf(kind, ms, tz) {
  if (kind === 'daily') return dayOf(ms, tz);
  if (kind === 'weekly') return weekOf(ms, tz);
  if (kind === 'monthly') return monthOf(ms, tz);
  throw new Error(`periode inconnue : ${kind}`);
}

module.exports = { parts, offsetMin, localMidnight, dayOf, weekOf, monthOf, monthFromKey, periodOf, MONTHS, localInstant, parseLocal };

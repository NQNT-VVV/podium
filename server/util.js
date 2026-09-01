'use strict';

const crypto = require('crypto');

const newId = (prefix = '') => prefix + crypto.randomBytes(9).toString('base64url');
const newToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Forme canonique d'un pseudo : sans accents, en minuscules, espaces reduits. */
function normalizePseudo(raw) {
  return String(raw || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const PSEUDO_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;

/** Rend le pseudo nettoye, ou une erreur lisible. */
function validatePseudo(raw) {
  const pseudo = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!PSEUDO_RE.test(pseudo)) {
    return { error: 'Le pseudo fait 2 a 20 caracteres : lettres, chiffres, espaces, tirets, points ou soulignes.' };
  }
  return { pseudo, norm: normalizePseudo(pseudo) };
}

/** Un emoji (ou une courte sequence). Le reste est refuse. */
function validateAvatar(raw, fallback = '🎮') {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if ([...s].length > 4 || s.length > 16) return null;
  if (/[\p{L}\p{N}<>"'&\\/]/u.test(s)) return null;
  return s;
}

const json = (raw, fallback) => {
  if (raw === null || raw === undefined) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expected = true;
  }
}

module.exports = { newId, newToken, sha256, safeEqual, normalizePseudo, validatePseudo, validateAvatar, json, ApiError };

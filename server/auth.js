'use strict';

/**
 * Comptes, sessions et cookie d'identite partage (SSO).
 *
 * - Le mot de passe est hache par scrypt (Node, sans dependance native).
 * - La session est un jeton aleatoire dont seul le hachage est stocke : une
 *   fuite de la base ne donne aucun cookie utilisable.
 * - Le cookie SSO est un payload signe HMAC que les jeux verifient hors ligne
 *   avec le meme secret. Il ne porte que l'identite publique.
 */

const crypto = require('crypto');

const config = require('./config');
const repo = require('./repo');
const { newId, newToken, sha256, safeEqual, validatePseudo, validateAvatar, normalizePseudo, ApiError } = require('./util');

/* ------------------------------------------------------------------ */
/* Mots de passe                                                      */
/* ------------------------------------------------------------------ */

const SCRYPT = { N: 16384, r: 8, p: 1 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [algo, n, salt, hash] = stored.split('$');
  if (algo !== 'scrypt') return false;
  const key = crypto.scryptSync(password, Buffer.from(salt, 'base64'), 64, { ...SCRYPT, N: Number(n) });
  return crypto.timingSafeEqual(key, Buffer.from(hash, 'base64'));
}

function validatePassword(raw) {
  const p = String(raw || '');
  if (p.length < 6) throw new ApiError('Le mot de passe fait au moins 6 caracteres.');
  if (p.length > 200) throw new ApiError('Mot de passe trop long.');
  return p;
}

/* ------------------------------------------------------------------ */
/* Tentatives de connexion                                            */
/* ------------------------------------------------------------------ */

const attempts = new Map(); // ip -> { n, since }

function checkAttempts(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.since > config.limits.loginWindowMs) attempts.delete(ip);
  const cur = attempts.get(ip);
  if (cur && cur.n >= config.limits.loginAttempts) throw new ApiError('Trop de tentatives. Reessaie dans quelques minutes.', 429);
}

function noteFailure(ip) {
  const cur = attempts.get(ip) || { n: 0, since: Date.now() };
  cur.n += 1;
  attempts.set(ip, cur);
}

/* ------------------------------------------------------------------ */
/* Cookies                                                            */
/* ------------------------------------------------------------------ */

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieString(name, value, { maxAge, domain, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (config.cookies.secure) parts.push('Secure');
  if (domain) parts.push(`Domain=${domain}`);
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

function appendCookie(res, str) {
  const prev = res.getHeader('Set-Cookie');
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  res.setHeader('Set-Cookie', [...list, str]);
}

/* ------------------------------------------------------------------ */
/* Cookie SSO                                                         */
/* ------------------------------------------------------------------ */

function signSso(user, days = config.cookies.ssoDays) {
  const payload = { v: 1, pid: user.id, pseudo: user.pseudo, avatar: user.avatar, exp: Math.floor(Date.now() / 1000) + days * 86400 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.ssoSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySso(raw) {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const expected = crypto.createHmac('sha256', config.ssoSecret).update(body).digest('base64url');
  if (!safeEqual(raw.slice(dot + 1), expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.v !== 1 || typeof p.pid !== 'string' || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Sessions                                                           */
/* ------------------------------------------------------------------ */

function openSession(res, user, req) {
  const token = newToken();
  const now = Date.now();
  repo.insertSession(sha256(token), user.id, now, now + config.cookies.sessionDays * 86400000, String(req?.headers['user-agent'] || '').slice(0, 200));
  appendCookie(res, cookieString(config.cookies.session, token, { maxAge: config.cookies.sessionDays * 86400 }));
  refreshSso(res, user);
}

function refreshSso(res, user) {
  appendCookie(res, cookieString(config.cookies.sso, signSso(user), {
    maxAge: config.cookies.ssoDays * 86400, domain: config.cookies.ssoDomain || undefined,
  }));
}

function closeSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[config.cookies.session];
  if (token) repo.deleteSession(sha256(token));
  appendCookie(res, cookieString(config.cookies.session, '', { maxAge: 0 }));
  appendCookie(res, cookieString(config.cookies.sso, '', { maxAge: 0, domain: config.cookies.ssoDomain || undefined }));
}

/**
 * Middleware : `req.user` est l'utilisateur connecte ou null. Le cookie SSO
 * est reemis quand il approche de l'expiration, pour qu'une personne active
 * ne le voie jamais tomber.
 */
function attachUser(req, res, next) {
  req.user = null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[config.cookies.session];
  if (token) {
    const session = repo.sessionById(sha256(token));
    if (session) {
      const user = repo.userById(session.user_id);
      if (user) {
        req.user = user;
        const sso = verifySso(cookies[config.cookies.sso]);
        const stale = !sso || sso.pid !== user.id || sso.pseudo !== user.pseudo || sso.avatar !== user.avatar
          || sso.exp * 1000 - Date.now() < 7 * 86400000;
        if (stale) refreshSso(res, user);
        if (Date.now() - user.lastSeenAt > 60000) repo.touchUser(user.id);
      }
    }
  }
  next();
}

function requireUser(req) {
  if (!req.user) throw new ApiError('Connexion requise.', 401);
  return req.user;
}

function requireAdmin(req) {
  const user = requireUser(req);
  if (user.role !== 'admin') throw new ApiError('Reserve aux administrateurs.', 403);
  return user;
}

/* ------------------------------------------------------------------ */
/* Inscription / connexion                                            */
/* ------------------------------------------------------------------ */

function roleFor(norm) {
  if (repo.userCount() === 0) return 'admin';
  return config.adminPseudos.map(normalizePseudo).includes(norm) ? 'admin' : 'player';
}

function register({ pseudo, password, avatar }) {
  const v = validatePseudo(pseudo);
  if (v.error) throw new ApiError(v.error);
  const pass = validatePassword(password);
  const av = validateAvatar(avatar);
  if (av === null) throw new ApiError('L’avatar est un emoji.');
  if (repo.userByNorm(v.norm)) throw new ApiError('Ce pseudo est deja pris.', 409);
  const now = Date.now();
  return repo.insertUser({
    id: newId('u_'), pseudo: v.pseudo, pseudoNorm: v.norm, avatar: av,
    passwordHash: hashPassword(pass), discordId: null, discordName: null,
    role: roleFor(v.norm), createdAt: now, lastSeenAt: now,
  });
}

function login({ pseudo, password }, ip) {
  checkAttempts(ip);
  const user = repo.userByNorm(normalizePseudo(pseudo));
  if (!user || !user.hasPassword || !verifyPassword(String(password || ''), user.passwordHash)) {
    noteFailure(ip);
    throw new ApiError('Pseudo ou mot de passe incorrect.', 401);
  }
  return user;
}

/** Pseudo libre a partir d'un nom Discord, avec un suffixe si besoin. */
function freePseudoFrom(name) {
  let base = String(name || 'Joueur').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (base.length < 2) base = 'Joueur';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    if (!repo.userByNorm(normalizePseudo(candidate))) return candidate;
  }
  return `${base}${crypto.randomBytes(2).toString('hex')}`;
}

function updateProfile(user, { pseudo, avatar }) {
  const v = pseudo !== undefined ? validatePseudo(pseudo) : { pseudo: user.pseudo, norm: user.pseudoNorm };
  if (v.error) throw new ApiError(v.error);
  const av = avatar !== undefined ? validateAvatar(avatar, user.avatar) : user.avatar;
  if (av === null) throw new ApiError('L’avatar est un emoji.');
  const clash = repo.userByNorm(v.norm);
  if (clash && clash.id !== user.id) throw new ApiError('Ce pseudo est deja pris.', 409);
  repo.updateUser({ id: user.id, pseudo: v.pseudo, pseudoNorm: v.norm, avatar: av });
  return repo.userById(user.id);
}

function changePassword(user, { current, next }) {
  if (user.hasPassword && !verifyPassword(String(current || ''), user.passwordHash)) throw new ApiError('Mot de passe actuel incorrect.', 401);
  repo.setPassword(user.id, hashPassword(validatePassword(next)));
}

module.exports = {
  hashPassword, verifyPassword, parseCookies, cookieString, appendCookie,
  signSso, verifySso, openSession, refreshSso, closeSession, attachUser, requireUser, requireAdmin,
  register, login, freePseudoFrom, updateProfile, changePassword, roleFor,
};

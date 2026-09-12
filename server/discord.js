'use strict';

/**
 * Connexion par Discord (OAuth2, portee `identify`).
 *
 * Module optionnel : sans identifiants, les routes repondent 404 et le bouton
 * n'apparait pas. Avec, une personne se connecte en deux clics et son compte
 * Podium est cree a la volee, pseudo tire de son nom Discord.
 */

const crypto = require('crypto');

const config = require('./config');
const repo = require('./repo');
const auth = require('./auth');
const { newId, normalizePseudo, ApiError } = require('./util');

const enabled = () => config.discord.configured;
const STATE_COOKIE = 'podium_oauth';

function redirectUri(req) {
  const origin = config.publicUrl || `${req.protocol}://${req.get('host')}`;
  return `${origin}/api/auth/discord/callback`;
}

/** Depart : on pose un etat aleatoire en cookie et on envoie chez Discord. */
function start(req, res) {
  if (!enabled()) throw new ApiError('Connexion Discord non configuree.', 404);
  const state = crypto.randomBytes(16).toString('hex');
  // « link » : la personne est deja connectee et veut rattacher Discord a son compte.
  const mode = req.user ? 'link' : 'login';
  auth.appendCookie(res, auth.cookieString(STATE_COOKIE, `${state}.${mode}`, { maxAge: 600 }));
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', config.discord.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri(req));
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');
  res.redirect(url.toString());
}

async function callback(req, res) {
  if (!enabled()) throw new ApiError('Connexion Discord non configuree.', 404);
  const cookies = auth.parseCookies(req.headers.cookie);
  const [state, mode] = String(cookies[STATE_COOKIE] || '').split('.');
  auth.appendCookie(res, auth.cookieString(STATE_COOKIE, '', { maxAge: 0 }));
  if (!state || state !== req.query.state) throw new ApiError('Etat OAuth invalide, recommence.', 400);
  const code = String(req.query.code || '');
  if (!code) throw new ApiError('Connexion Discord annulee.', 400);

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.discord.clientId, client_secret: config.discord.clientSecret,
      grant_type: 'authorization_code', code, redirect_uri: redirectUri(req),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new ApiError('Discord a refuse le code.', 502);
  const token = await tokenRes.json();

  const meRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(8000),
  });
  if (!meRes.ok) throw new ApiError('Profil Discord illisible.', 502);
  const me = await meRes.json();
  const discordName = me.global_name || me.username || 'Joueur';

  let user = repo.userByDiscord(me.id);
  if (mode === 'link' && req.user) {
    if (user && user.id !== req.user.id) throw new ApiError('Ce compte Discord est deja rattache a un autre joueur.', 409);
    repo.linkDiscord(req.user.id, me.id, discordName);
    return res.redirect('/moi?discord=ok');
  }
  if (!user) {
    const pseudo = auth.freePseudoFrom(discordName);
    const norm = normalizePseudo(pseudo);
    const now = Date.now();
    user = repo.insertUser({
      id: newId('u_'), pseudo, pseudoNorm: norm, avatar: '🎮',
      passwordHash: null, discordId: me.id, discordName, role: auth.roleFor(norm, me.id),
      createdAt: now, lastSeenAt: now,
    });
  } else if (user.role !== 'admin' && config.adminDiscordIds.includes(String(me.id))) {
    // Un identifiant ajoute a ADMIN_DISCORD_IDS apres coup prend effet a la connexion suivante.
    repo.setRole(user.id, 'admin');
    user = repo.userById(user.id);
  }
  auth.openSession(res, user, req);
  res.redirect('/');
}

module.exports = { enabled, start, callback };

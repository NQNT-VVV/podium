'use strict';

/**
 * Toute la configuration du serveur, lue une fois au demarrage.
 *
 * C'est le seul fichier autorise a lire `process.env` : partout ailleurs on
 * importe `config`. Une valeur ecrite en dur dans un module metier serait
 * invisible depuis le manifeste de deploiement.
 */

const path = require('path');
const crypto = require('crypto');

const str = (name, fallback) => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
};

const int = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const bool = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
};

const list = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

const dev = process.env.NODE_ENV !== 'production';
const DATA_DIR = path.resolve(str('DATA_DIR', path.join(__dirname, '..', 'data')));
const PORT = int('PORT', 3000);

/**
 * Secret du cookie d'identite partage avec les jeux (SSO).
 *
 * En production il doit venir de l'environnement : c'est le meme secret que
 * les jeux utilisent pour verifier le cookie, un secret aleatoire au
 * demarrage les rendrait tous aveugles. En developpement on tolere
 * l'aleatoire pour ne pas imposer un fichier .env au premier lancement.
 */
const SSO_SECRET = str('SSO_SECRET', null) || (() => {
  if (!dev) throw new Error('SSO_SECRET est obligatoire en production : les jeux verifient le cookie d’identite avec lui.');
  return crypto.randomBytes(32).toString('hex');
})();

const publicUrl = str('PUBLIC_URL', '').replace(/\/+$/, '');
const discordConfigured = Boolean(str('DISCORD_CLIENT_ID', '') && str('DISCORD_CLIENT_SECRET', ''));

const config = {
  dev,
  /** Tests : servir l'API seule, sans compiler les pages Next. */
  apiOnly: /^(1|true|yes|on)$/i.test(process.env.API_ONLY || ''),
  port: PORT,
  metricsPort: int('METRICS_PORT', 9464),

  /** Origine publique : redirections OAuth, liens absolus. Vide = deduite de la requete. */
  publicUrl,
  /** Les pages Next appellent l'API du meme processus par la boucle locale. */
  internalApiUrl: str('INTERNAL_API_URL', `http://127.0.0.1:${PORT}`),

  dataDir: DATA_DIR,
  dbPath: str('DB_PATH', path.join(DATA_DIR, 'podium.db')),

  /** Cookies. `Secure` des que l'origine publique est en https. */
  cookies: {
    secure: publicUrl.startsWith('https://'),
    session: str('SESSION_COOKIE', 'podium_session'),
    sessionDays: int('SESSION_DAYS', 30),
    sso: str('SSO_COOKIE', 'nqnt_id'),
    /** Ex. `.danwalex.com` pour que les jeux sur les sous-domaines lisent le cookie. Vide = hote seul. */
    ssoDomain: str('SSO_COOKIE_DOMAIN', ''),
    ssoDays: int('SSO_DAYS', 30),
  },
  ssoSecret: SSO_SECRET,

  /** Pseudos promus administrateurs a l'inscription. Le premier compte cree l'est toujours. */
  adminPseudos: list('ADMIN_PSEUDOS', []),
  /** Identifiants Discord (snowflakes) promus administrateurs a la connexion. */
  adminDiscordIds: list('ADMIN_DISCORD_IDS', []),

  /**
   * Connexion Discord : inerte sans identifiants.
   *
   * Des que Discord est configure, c'est la seule porte d'entree : pas de
   * mot de passe a gerer, un seul compte par personne. La connexion par
   * pseudo et mot de passe ne sert qu'en local, ou si PASSWORD_LOGIN la
   * reactive explicitement.
   */
  discord: {
    clientId: str('DISCORD_CLIENT_ID', ''),
    clientSecret: str('DISCORD_CLIENT_SECRET', ''),
    configured: discordConfigured,
  },
  auth: {
    passwordLogin: bool('PASSWORD_LOGIN', !discordConfigured),
  },

  /** Fuseau des saisons, semaines et jours. */
  timeZone: str('TIME_ZONE', 'Europe/Paris'),

  rating: {
    start: int('RATING_START', 1000),
    /** K eleve en placement, puis stabilise. */
    kPlacement: int('RATING_K_PLACEMENT', 40),
    k: int('RATING_K', 24),
    kHigh: int('RATING_K_HIGH', 16),
    placementMatches: int('RATING_PLACEMENT_MATCHES', 3),
  },

  limits: {
    maxPlayersPerMatch: int('MAX_PLAYERS_PER_MATCH', 200),
    loginAttempts: int('LOGIN_ATTEMPTS', 20),
    loginWindowMs: int('LOGIN_WINDOW_S', 900) * 1000,
  },

  /** Frequence du planificateur (defis a creer, defis a clore). */
  schedulerMs: int('SCHEDULER_S', 300) * 1000,
};

module.exports = config;

'use strict';

/**
 * Le salon, les avis, et la lecture qu'on en fait.
 *
 * Trois choses de meme nature : ce que les gens ont a dire. Le salon est
 * collectif et ephemere, l'avis est adresse a qui tient le site et porte une
 * note, le reporting n'est que la relecture des avis — aucune donnee propre.
 *
 * Tout ce qui protege le salon tient ici, pas dans les routes : une regle
 * ecrite dans une route ne vaut que pour cette route.
 */

const config = require('./config');
const repo = require('./repo');
const { ApiError } = require('./util');

const KINDS = new Set(['avis', 'bug', 'idee']);
const STATUSES = new Set(['nouveau', 'lu', 'traite']);
const DAY = 86400000;

/**
 * Nettoyage d'un texte recu.
 *
 * On normalise les fins de ligne, on ecrase les rafales de lignes vides — un
 * message de quarante retours chariot pousse tout le reste hors de l'ecran,
 * et c'est le seul moyen de crier quand la longueur est bornee.
 */
function clean(raw, max) {
  const text = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Salon                                                              */
/* ------------------------------------------------------------------ */

/**
 * Le fil depuis un curseur.
 *
 * `since` a 0 rend la fin du fil, remise dans l'ordre de lecture. Au-dela, on
 * rend ce qui a suivi — y compris les messages effaces entre-temps, prives de
 * leur corps : une page qui ne recevrait pas leur disparition les garderait
 * affiches indefiniment.
 */
function chatSince(since = 0, limit = 200) {
  const n = Math.max(1, Math.min(500, Number(limit) || 200));
  const messages = repo.chatSince(Math.max(0, Number(since) || 0), n);
  const last = messages.length ? messages[messages.length - 1].id : Number(since) || 0;
  return { messages, cursor: last };
}

/** Poster. Le pseudo et l'avatar viennent du compte, jamais de la charge utile. */
function postChat(user, raw, now = Date.now()) {
  if (!user) throw new ApiError('Connectez-vous pour parler dans le salon.', 401);

  const body = clean(raw, config.limits.chatLength);
  if (!body) throw new ApiError('Un message vide n’a rien a dire.');

  // Le delai d'abord : c'est le refus le plus frequent, et le moins couteux.
  const gap = now - repo.chatLastAt(user.id);
  if (gap < config.limits.chatGapMs) {
    const reste = Math.ceil((config.limits.chatGapMs - gap) / 1000);
    throw new ApiError(`Laissez passer ${reste} seconde${reste > 1 ? 's' : ''} entre deux messages.`, 429);
  }
  if (repo.chatCountSince(user.id, now - 3600000) >= config.limits.chatPerHour) {
    throw new ApiError('Vous avez beaucoup parle cette heure-ci. Reprenez dans un moment.', 429);
  }

  return repo.insertChat(user.id, body, now);
}

/**
 * Retrait d'un message.
 *
 * Son auteur peut se retracter, un administrateur peut moderer. La ligne
 * reste, videe : le fil doit pouvoir apprendre la disparition.
 */
function removeChat(user, id, now = Date.now()) {
  if (!user) throw new ApiError('Connectez-vous.', 401);
  const message = repo.chatById(Number(id));
  if (!message) throw new ApiError('Ce message n’existe pas.', 404);
  if (message.deleted) return message;

  const sien = message.userId === user.id;
  if (!sien && user.role !== 'admin') throw new ApiError('Ce message n’est pas le votre.', 403);

  repo.chatSoftDelete(message.id, user.id, now);
  return repo.chatById(message.id);
}

/** Purge du salon : ce qui a passe l'age convenu s'efface pour de bon. */
function purgeChat(now = Date.now()) {
  if (!config.limits.chatKeepDays) return 0;
  return repo.purgeChat(now - config.limits.chatKeepDays * DAY);
}

/* ------------------------------------------------------------------ */
/* Avis                                                               */
/* ------------------------------------------------------------------ */

/**
 * Depot d'un avis.
 *
 * La note va de 1 a 5 et reste facultative : un rapport de bug n'a pas de
 * note a donner, et exiger une etoile pour signaler un probleme reviendrait a
 * en recevoir moins.
 */
function postFeedback(user, payload = {}, now = Date.now()) {
  if (!user) throw new ApiError('Connectez-vous pour donner votre avis.', 401);

  const kind = KINDS.has(payload.kind) ? payload.kind : 'avis';
  const body = clean(payload.body, config.limits.feedbackLength);

  let score = null;
  if (payload.score !== null && payload.score !== undefined && payload.score !== '') {
    const n = Math.round(Number(payload.score));
    if (!Number.isFinite(n) || n < 1 || n > 5) throw new ApiError('La note va de 1 a 5.');
    score = n;
  }
  /*
   * La regle propre a la nature passe avant la regle generale.
   *
   * Sans cet ordre, quelqu'un qui signale un bug sans le decrire s'entendait
   * repondre « mettez une note » — alors qu'une note n'a rien a faire dans un
   * rapport de bug. Le message d'erreur doit parler du geste qu'on vient de
   * faire, pas d'un autre.
   */
  if (kind !== 'avis' && !body) throw new ApiError('Decrivez le probleme ou l’idee en quelques mots.');
  // Un avis sans note ni texte ne dit rien : on prefere le refuser que le
  // compter dans une moyenne qu'il ne nourrit pas.
  if (score === null && !body) throw new ApiError('Mettez une note, ou dites ce qui ne va pas.');

  if (repo.feedbackCountSince(user.id, now - DAY) >= config.limits.feedbackPerDay) {
    throw new ApiError('Vous avez deja envoye plusieurs retours aujourd’hui. Merci, et a demain.', 429);
  }

  // La page d'ou vient le retour vaut la moitie d'un rapport de bug : on la
  // garde, mais bornee et sans domaine, pour qu'elle reste un chemin.
  const page = String(payload.page || '').replace(/^https?:\/\/[^/]+/i, '').slice(0, 120);

  return repo.insertFeedback({ userId: user.id, kind, score, body, page, createdAt: now });
}

/** Ses propres retours, pour qu'on sache ce qu'on a deja dit. */
function myFeedback(user, limit = 5) {
  if (!user) throw new ApiError('Connectez-vous.', 401);
  return repo.feedbackMine(user.id, limit);
}

/** Suivi d'un avis par l'equipe : lu, traite, avec une note interne. */
function setFeedbackStatus(admin, id, payload = {}, now = Date.now()) {
  const status = String(payload.status || '');
  if (!STATUSES.has(status)) throw new ApiError('Etat inconnu.');
  const item = repo.feedbackById(Number(id));
  if (!item) throw new ApiError('Cet avis n’existe pas.', 404);
  repo.feedbackSetStatus(item.id, status, clean(payload.note, 500), admin.id, now);
  return repo.feedbackById(item.id);
}

/* ------------------------------------------------------------------ */
/* Reporting                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce que disent les avis, sur une fenetre.
 *
 * La moyenne seule ment : deux publics opposes rendent la meme moyenne qu'un
 * public tiede. On rend donc toujours la repartition avec elle, et le compte
 * de ce sur quoi elle porte — une moyenne sur trois avis n'est pas une
 * moyenne, et la page doit pouvoir le dire.
 */
function reporting({ days = 30, kind = '', status = '', limit = 30, offset = 0 } = {}, now = Date.now()) {
  const fenetre = Math.max(1, Math.min(365, Number(days) || 30));
  const since = now - fenetre * DAY;

  const spread = [1, 2, 3, 4, 5].map((score) => ({ score, n: 0 }));
  for (const row of repo.feedbackSpread(since)) {
    const cell = spread.find((c) => c.score === row.score);
    if (cell) cell.n = row.n;
  }
  const notes = spread.reduce((t, c) => t + c.n, 0);
  const somme = spread.reduce((t, c) => t + c.score * c.n, 0);

  const parKind = {};
  for (const row of repo.feedbackByKind(since)) {
    parKind[row.kind] = { n: row.n, average: row.avg === null ? null : Math.round(row.avg * 100) / 100 };
  }
  const parStatus = { nouveau: 0, lu: 0, traite: 0 };
  for (const row of repo.feedbackByStatus()) {
    if (row.status in parStatus) parStatus[row.status] = row.n;
  }

  // Une serie continue : un jour sans avis est un zero, pas un trou. Une
  // courbe qui saute les jours vides raconte une regularite qui n'existe pas.
  const premier = Math.floor(since / DAY);
  const dernier = Math.floor(now / DAY);
  const parJour = new Map(repo.feedbackDaily(since).map((r) => [r.day, r]));
  const daily = [];
  for (let day = premier; day <= dernier; day++) {
    const row = parJour.get(day);
    daily.push({
      at: day * DAY,
      n: row ? row.n : 0,
      average: row && row.avg !== null ? Math.round(row.avg * 100) / 100 : null,
    });
  }

  return {
    window: { days: fenetre, since, until: now },
    score: {
      average: notes ? Math.round((somme / notes) * 100) / 100 : null,
      count: notes,
      spread,
    },
    kinds: parKind,
    statuses: parStatus,
    daily,
    pages: repo.feedbackPages(since),
    chat: { messages: repo.chatTotal(), keepDays: config.limits.chatKeepDays },
    total: repo.feedbackCount({ kind, status }),
    items: repo.feedbackList({ kind, status, limit: Math.min(100, Number(limit) || 30), offset: Math.max(0, Number(offset) || 0) }),
  };
}

module.exports = {
  chatSince, postChat, removeChat, purgeChat,
  postFeedback, myFeedback, setFeedbackStatus,
  reporting,
  KINDS, STATUSES,
};

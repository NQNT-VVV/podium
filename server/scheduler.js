'use strict';

/**
 * Taches de fond : defis a creer pour la periode courante et la suivante,
 * defis termines a clore (badges), sessions, journaux et messages du salon
 * perimes a purger.
 * Idempotent : peut tourner autant de fois qu'on veut.
 */

const config = require('./config');
const repo = require('./repo');
const challenges = require('./challenges');
const community = require('./community');

function tick() {
  try {
    const created = challenges.ensureAll();
    const closed = challenges.closeEnded();
    if (created.length) console.log(`[podium] ${created.length} defi(s) cree(s) : ${created.map((c) => c.slug).join(', ')}`);
    if (closed.length) console.log(`[podium] ${closed.length} defi(s) clos : ${closed.map((c) => c.slug).join(', ')}`);
    repo.purgeSessions();
    repo.purgeLogs(Date.now() - 30 * 86400000);
    // Le salon oublie de lui-meme : ce qui s'y dit n'a pas vocation a rester.
    const oublies = community.purgeChat();
    if (oublies) console.log(`[podium] salon : ${oublies} message(s) perime(s) efface(s)`);
    const gone = purgeInactive();
    if (gone) console.log(`[podium] ${gone} compte(s) inactif(s) supprime(s)`);
  } catch (err) {
    console.error('[podium] planificateur', err);
  }
}

/** Depart automatique des comptes sans connexion depuis INACTIVE_ACCOUNT_DAYS. */
function purgeInactive(now = Date.now()) {
  if (!config.inactiveAccountDays) return 0;
  let n = 0;
  for (const user of repo.inactiveUsers(now - config.inactiveAccountDays * 86400000)) {
    repo.deleteUser(user.id);
    n += 1;
  }
  return n;
}

function start() {
  tick();
  const timer = setInterval(tick, config.schedulerMs);
  timer.unref?.();
  return timer;
}

module.exports = { start, tick, purgeInactive };

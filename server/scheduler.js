'use strict';

/**
 * Taches de fond : defis a creer pour la periode courante et la suivante,
 * defis termines a clore (badges), sessions et journaux perimes a purger.
 * Idempotent : peut tourner autant de fois qu'on veut.
 */

const config = require('./config');
const repo = require('./repo');
const challenges = require('./challenges');

function tick() {
  try {
    const created = challenges.ensureAll();
    const closed = challenges.closeEnded();
    if (created.length) console.log(`[podium] ${created.length} defi(s) cree(s) : ${created.map((c) => c.slug).join(', ')}`);
    if (closed.length) console.log(`[podium] ${closed.length} defi(s) clos : ${closed.map((c) => c.slug).join(', ')}`);
    repo.purgeSessions();
    repo.purgeLogs(Date.now() - 30 * 86400000);
  } catch (err) {
    console.error('[podium] planificateur', err);
  }
}

function start() {
  tick();
  const timer = setInterval(tick, config.schedulerMs);
  timer.unref?.();
  return timer;
}

module.exports = { start, tick };

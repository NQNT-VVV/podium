'use strict';

const path = require('path');
const express = require('express');
const http = require('http');

const config = require('./config');
const repo = require('./repo');
const seed = require('./seed');
const auth = require('./auth');
const api = require('./api');
const scheduler = require('./scheduler');
const metrics = require('./metrics');

const ROOT_DIR = path.join(__dirname, '..');

const app = express();
/*
 * Un seul relais devant nous, pas une chaine.
 *
 * `true` faisait confiance a tous les bonds, donc a l'en-tete envoye par le
 * client : il suffisait d'en changer a chaque essai pour se donner un
 * compteur neuf et rendre le limiteur de connexion decoratif.
 */
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(auth.attachUser);

api.register(app);

async function main() {
  const seeded = seed.run();
  if (seeded) console.log(`[podium] catalogue initial : ${seeded} jeu(x)`);

  if (!config.apiOnly) {
    // eslint-disable-next-line global-require
    const next = require('next');
    const nextApp = next({ dev: config.dev, dir: ROOT_DIR });
    await nextApp.prepare();
    const render = nextApp.getRequestHandler();
    app.use((req, res) => render(req, res));
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(config.port, '0.0.0.0', resolve));
  metrics.serve();
  scheduler.start();

  console.log(`\n  🏆  Podium — serveur pret\n\n     http://localhost:${config.port}\n     metriques : http://127.0.0.1:${config.metricsPort}/metrics\n`);
  console.log(`[podium] ${repo.userCount()} compte(s), ${repo.countMatches()} partie(s), base ${config.dbPath}`);
  if (config.dev && !process.env.SSO_SECRET) console.log('[podium] SSO_SECRET absent : secret aleatoire, les jeux ne reconnaitront pas ce cookie.');
}

main().catch((err) => {
  console.error('[podium] demarrage impossible', err);
  process.exit(1);
});

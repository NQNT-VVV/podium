'use strict';

/** Metriques Prometheus, servies sur un port a part, jamais par l'Ingress. */

const http = require('http');
const client = require('prom-client');

const config = require('./config');
const repo = require('./repo');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'podium_' });

const resultsTotal = new client.Counter({
  name: 'podium_results_total', help: 'Classements recus des jeux, par jeu et statut.', labelNames: ['game', 'status'], registers: [registry],
});
const loginsTotal = new client.Counter({
  name: 'podium_logins_total', help: 'Connexions reussies, par methode.', labelNames: ['method'], registers: [registry],
});
new client.Gauge({
  name: 'podium_users', help: 'Comptes crees.', registers: [registry],
  collect() { this.set(repo.userCount()); },
});
new client.Gauge({
  name: 'podium_matches', help: 'Parties enregistrees.', registers: [registry],
  collect() { this.set(repo.countMatches()); },
});
new client.Gauge({
  name: 'podium_challenges_active', help: 'Defis en cours.', registers: [registry],
  collect() { this.set(repo.activeChallenges().length); },
});

function serve() {
  const server = http.createServer(async (req, res) => {
    if (req.url !== '/metrics') { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  server.listen(config.metricsPort, '0.0.0.0');
  return server;
}

module.exports = { registry, resultsTotal, loginsTotal, serve };

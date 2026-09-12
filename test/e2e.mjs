// Parcours complet sur un serveur reel, API seule : comptes, cle de jeu,
// ingestion, Elo, saison, defis, SSO, profil.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3900 + Math.floor(Math.random() * 100);
const METRICS = PORT + 1000;
const SECRET = 'e2e-secret';
const dataDir = mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir(), 'podium-e2e-'));

const child = spawn(process.execPath, ['server/index.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), METRICS_PORT: String(METRICS), DATA_DIR: dataDir, API_ONLY: '1', SSO_SECRET: SECRET, NODE_ENV: 'production', PUBLIC_URL: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (d) => { logs += d; });
child.stderr.on('data', (d) => { logs += d; });

const base = `http://127.0.0.1:${PORT}`;
const jars = new Map();

async function call(who, method, url, body, headers = {}) {
  const jar = jars.get(who) || {};
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(base + url, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  });
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const [pair, ...attrs] = sc.split(';');
    const [k, v] = pair.split('=');
    if (attrs.some((a) => a.trim() === 'Max-Age=0')) delete jar[k.trim()];
    else jar[k.trim()] = decodeURIComponent(v);
  }
  jars.set(who, jar);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* pas du JSON */ }
  return { status: res.status, json, text };
}

async function waitReady() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${base}/api/health`); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`serveur muet\n${logs}`);
}

try {
  await waitReady();

  // Comptes : le premier est admin.
  let r = await call('alice', 'POST', '/api/auth/register', { pseudo: 'Alice', password: 'secret1', avatar: '🦊' });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.user.role, 'admin');
  const alice = r.json.user;
  r = await call('bob', 'POST', '/api/auth/register', { pseudo: 'Bob', password: 'secret2' });
  assert.equal(r.json.user.role, 'player');
  const bob = r.json.user;
  r = await call('carol', 'POST', '/api/auth/register', { pseudo: 'Carol', password: 'secret3' });
  const carol = r.json.user;
  r = await call('x', 'POST', '/api/auth/register', { pseudo: 'alice', password: 'secret1' });
  assert.equal(r.status, 409, 'le pseudo est unique sans casse');
  r = await call('x', 'POST', '/api/auth/register', { pseudo: '<script>', password: 'secret1' });
  assert.equal(r.status, 400);

  // Cookie SSO : verifiable par le client de reference avec le meme secret.
  process.env.PODIUM_URL = base; process.env.PODIUM_SSO_SECRET = SECRET;
  const client = require('../docs/podium-client.js');
  const jar = jars.get('alice');
  assert.ok(jar.nqnt_id, 'cookie SSO pose');
  const ident = client.readIdentity(`nqnt_id=${encodeURIComponent(jar.nqnt_id)}`);
  assert.deepEqual(ident, { pid: alice.id, pseudo: 'Alice', avatar: '🦊' });
  assert.equal(client.readIdentity(`nqnt_id=${encodeURIComponent(jar.nqnt_id.slice(0, -2) + 'xx')}`), null, 'signature alteree refusee');

  // Session.
  r = await call('alice', 'GET', '/api/auth/me');
  assert.equal(r.json.user.pseudo, 'Alice');
  r = await call('nobody', 'GET', '/api/auth/me');
  assert.equal(r.json.user, null);
  r = await call('bob', 'POST', '/api/auth/login', { pseudo: 'BOB', password: 'mauvais' });
  assert.equal(r.status, 401);

  // Catalogue seede, cle d'ingestion reservee a l'admin.
  r = await call('nobody', 'GET', '/api/games');
  assert.deepEqual(r.json.games.map((g) => g.slug), ['refrain', 'arena']);
  r = await call('bob', 'POST', '/api/admin/games/refrain/key');
  assert.equal(r.status, 403);
  r = await call('alice', 'POST', '/api/admin/games/refrain/key');
  assert.equal(r.status, 200);
  const key = r.json.key;
  assert.match(key, /^pk_refrain_/);

  // Ingestion : cle exigee, payload valide.
  const payload = {
    matchId: 'ABCD-1', mode: 'input', playedAt: Date.now() - 60000, durationS: 900, meta: { playlist: 'Annees 90' },
    players: [
      { pid: alice.id, nickname: 'Alice', avatar: '🦊', score: 1200, rank: 1 },
      { pid: null, nickname: 'Invite', avatar: '🐸', score: 900, rank: 2 },
      { pid: bob.id, nickname: 'Bobby', score: 600, rank: 3 },
    ],
  };
  r = await call('game', 'POST', '/api/v1/games/refrain/results', payload);
  assert.equal(r.status, 401);
  const auth = { Authorization: `Bearer ${key}` };
  r = await call('game', 'POST', '/api/v1/games/refrain/results', { ...payload, players: [] }, auth);
  assert.equal(r.status, 422);
  r = await call('game', 'POST', '/api/v1/games/nope/results', payload, auth);
  assert.equal(r.status, 404);
  r = await call('game', 'POST', '/api/v1/games/refrain/results', payload, auth);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.duplicate, false);
  assert.equal(r.json.ratings.length, 2, 'seuls les comptes sont cotes');
  const aliceDelta = r.json.ratings.find((x) => x.pid === alice.id);
  const bobDelta = r.json.ratings.find((x) => x.pid === bob.id);
  assert.ok(aliceDelta.after > 1000 && bobDelta.after < 1000);

  // Idempotence.
  r = await call('game', 'POST', '/api/v1/games/refrain/results', payload, auth);
  assert.equal(r.json.duplicate, true);
  r = await call('nobody', 'GET', '/api/health');
  assert.equal(r.json.matches, 1);

  // Deux autres parties pour sortir Alice du placement.
  for (let i = 2; i <= 3; i++) {
    r = await call('game', 'POST', '/api/v1/games/refrain/results', {
      matchId: `ABCD-${i}`, mode: 'buzzer', players: [
        { pid: alice.id, nickname: 'Alice', score: 10, rank: 1 }, { pid: carol.id, nickname: 'Carol', score: 5, rank: 2 },
      ],
    }, auth);
    assert.equal(r.status, 200, r.text);
  }

  // Page jeu : ladder, saison, defis, parties.
  r = await call('nobody', 'GET', '/api/games/refrain');
  assert.equal(r.json.ladder[0].pseudo, 'Alice');
  assert.equal(r.json.ladder[0].pos, 1);
  assert.equal(r.json.ladder[0].matches, 3);
  assert.notEqual(r.json.ladder[0].tier.id, 'placement');
  assert.equal(r.json.ladder.find((x) => x.pseudo === 'Bob').pos, null, 'Bob est encore en placement');
  assert.equal(r.json.season.rows[0].pseudo, 'Alice');
  assert.equal(r.json.season.rows[0].points, 330, '3 victoires a 110');
  assert.ok(r.json.challenges.some((c) => c.kind === 'mode' && c.mode === 'daily'));
  assert.equal(r.json.matches.length, 3);
  assert.equal(r.json.matches[2].players[1].nickname, 'Invite');
  assert.equal(r.json.matches[2].players[1].userId, null);

  // Classement global de saison.
  r = await call('nobody', 'GET', '/api/leaderboard');
  assert.equal(r.json.rows[0].pseudo, 'Alice');
  assert.equal(r.json.rows[0].wins, 3);
  assert.ok(r.json.seasons.length >= 1);
  r = await call('nobody', 'GET', '/api/leaderboard?season=2020-01');
  assert.equal(r.json.rows.length, 0);

  // Defis actifs pour le jeu, avec graine.
  r = await call('nobody', 'GET', '/api/v1/games/refrain/challenges/active');
  const daily = r.json.challenges.find((c) => c.kind === 'mode' && c.mode === 'daily');
  assert.ok(daily && daily.seed && daily.seed.length === 32, 'defi du jour avec graine');
  assert.ok(r.json.challenges.every((c) => c.kind !== 'mode' || c.seed));
  const weekly = r.json.challenges.find((c) => c.kind === 'auto');
  assert.ok(weekly, 'un defi hebdo auto existe');

  // Resultat solo du mode du jour : pas d'Elo, mais compte au defi.
  r = await call('game', 'POST', '/api/v1/games/refrain/results', {
    matchId: `daily-${daily.slug}-${carol.id}`, mode: 'daily', challengeId: daily.id, players: [{ pid: carol.id, nickname: 'Carol', score: 50, rank: 1 }],
  }, auth);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.ratings, []);
  r = await call('game', 'POST', '/api/v1/games/refrain/results', {
    matchId: `daily-${daily.slug}-${alice.id}`, mode: 'daily', challengeId: daily.id, players: [{ pid: alice.id, nickname: 'Alice', score: 30, rank: 1 }],
  }, auth);
  r = await call('nobody', 'GET', `/api/challenges/${daily.slug}`);
  assert.equal(r.json.challenge.board.length, 2);
  assert.equal(r.json.challenge.board[0].pseudo, 'Carol');
  assert.equal(r.json.challenge.board[0].value, 50);
  assert.equal(r.json.challenge.seed, undefined, 'la graine d’un defi en cours reste privee');

  // Defi auto hebdo : Alice a 3 victoires.
  r = await call('nobody', 'GET', '/api/challenges');
  const wk = r.json.active.find((c) => c.slug === weekly.slug);
  assert.ok(wk);
  if (wk.metric === 'wins' || wk.metric === 'podiums' || wk.metric === 'matches' || wk.metric === 'points') {
    assert.equal(wk.board[0].pseudo, 'Alice');
  }

  // Defi manuel, puis cloture forcee : badges.
  r = await call('alice', 'POST', '/api/admin/challenges', {
    title: 'Test express', gameSlug: 'refrain', metric: 'wins', startsAt: Date.now() - 3600000, endsAt: Date.now() - 1000, period: 'custom',
  });
  assert.equal(r.status, 201, r.text);
  r = await call('alice', 'POST', '/api/admin/challenges/run');
  assert.ok(r.json.closed >= 1);
  r = await call('nobody', 'GET', '/api/players/alice');
  assert.equal(r.json.user.pseudo, 'Alice');
  assert.ok(r.json.badges.some((b) => b.kind === 'gold' && b.label.startsWith('Test express')));
  assert.equal(r.json.ratings[0].gameSlug, 'refrain');
  assert.equal(r.json.ratings[0].pos, 1);
  assert.equal(r.json.season.points, 330);
  assert.equal(r.json.season.pos, 1);
  assert.equal(r.json.matches.length, 4);
  assert.equal(r.json.matches[0].mine.rank, 1);
  r = await call('nobody', 'GET', '/api/players/inconnu');
  assert.equal(r.status, 404);

  // Profil : changement d'avatar et de pseudo, cookie SSO rafraichi.
  r = await call('alice', 'PATCH', '/api/auth/me', { avatar: '🐺', pseudo: 'Alice W' });
  assert.equal(r.status, 200, r.text);
  const ident2 = client.readIdentity(`nqnt_id=${encodeURIComponent(jars.get('alice').nqnt_id)}`);
  assert.deepEqual(ident2, { pid: alice.id, pseudo: 'Alice W', avatar: '🐺' });
  r = await call('alice', 'PATCH', '/api/auth/me', { pseudo: 'bob' });
  assert.equal(r.status, 409);

  // Admin : ajout d'un jeu avec un mode hebdo, defis crees dans la foulee.
  r = await call('alice', 'POST', '/api/admin/games', {
    slug: 'puzzle', name: 'Puzzle', url: 'https://puzzle.example', emoji: '🧩', color: '#a3e635', status: 'soon',
    modes: [{ id: 'weekly-grid', label: 'Grille de la semaine', period: 'weekly', metric: 'best_score' }],
  });
  assert.equal(r.status, 201, r.text);
  r = await call('nobody', 'GET', '/api/v1/games/puzzle/challenges/active');
  assert.ok(r.json.challenges.some((c) => c.mode === 'weekly-grid' && c.seed));
  r = await call('alice', 'GET', '/api/admin/overview');
  assert.equal(r.json.games.length, 3);
  assert.ok(r.json.logs.length >= 4);

  // Accueil.
  r = await call('nobody', 'GET', '/api/home');
  assert.equal(r.json.stats.users, 3);
  assert.equal(r.json.stats.matches, 5);
  assert.equal(r.json.season.rows[0].pseudo, 'Alice W');

  // Deconnexion : cookies effaces.
  r = await call('alice', 'POST', '/api/auth/logout');
  assert.equal(jars.get('alice').podium_session, undefined);
  assert.equal(jars.get('alice').nqnt_id, undefined);
  r = await call('alice', 'GET', '/api/auth/me');
  assert.equal(r.json.user, null);

  // Metriques.
  const m = await (await fetch(`http://127.0.0.1:${METRICS}/metrics`)).text();
  assert.match(m, /podium_results_total\{game="refrain",status="ok"\} 5/);
  assert.match(m, /podium_users 3/);

  // Export et depart en libre-service.
  r = await call('bob', 'GET', '/api/auth/export');
  assert.equal(r.status, 200);
  assert.equal(r.json.account.pseudo, 'Bob');
  assert.ok(r.json.matches.length >= 1);
  r = await call('bob', 'DELETE', '/api/auth/me', { confirm: 'pas moi' });
  assert.equal(r.status, 400);
  r = await call('bob', 'DELETE', '/api/auth/me', { confirm: 'bob' });
  assert.equal(r.status, 200, r.text);
  assert.equal(jars.get('bob').podium_session, undefined, 'cookies effaces');
  r = await call('bob', 'GET', '/api/auth/me');
  assert.equal(r.json.user, null);
  r = await call('nobody', 'GET', '/api/players/bob');
  assert.equal(r.status, 404);
  r = await call('nobody', 'GET', '/api/games/refrain');
  assert.ok(!r.json.ladder.some((x) => x.pseudo === 'Bob'), 'plus au classement');
  const first = r.json.matches.find((m) => m.id.endsWith(':ABCD-1'));
  const bobLine = first.players.find((p) => p.rank === 3);
  assert.equal(bobLine.userId, null);
  assert.equal(bobLine.nickname, 'Joueur parti');
  r = await call('nobody', 'GET', '/api/health');
  assert.equal(r.json.users, 2);

  console.log('e2e : OK');
} catch (err) {
  console.error(err);
  console.error('--- logs serveur ---\n' + logs);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  rmSync(dataDir, { recursive: true, force: true });
}

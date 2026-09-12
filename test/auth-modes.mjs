// Discord configure : la connexion par mot de passe est fermee, la redirection
// OAuth est correcte, et PASSWORD_LOGIN=1 la rouvre.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function withServer(extraEnv, fn) {
  const port = 3800 + Math.floor(Math.random() * 100);
  const dataDir = mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir(), 'podium-auth-'));
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), METRICS_PORT: String(port + 1000), DATA_DIR: dataDir, API_ONLY: '1', SSO_SECRET: 's', NODE_ENV: 'production', PUBLIC_URL: 'https://podium.example', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* pas encore */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    await fn(base);
  } catch (err) {
    console.error(logs);
    throw err;
  } finally {
    child.kill('SIGTERM');
    rmSync(dataDir, { recursive: true, force: true });
  }
}

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Discord configure : mot de passe ferme.
await withServer({ DISCORD_CLIENT_ID: '123', DISCORD_CLIENT_SECRET: 'abc', ADMIN_DISCORD_IDS: '42,43' }, async (base) => {
  const me = await (await fetch(`${base}/api/auth/me`)).json();
  assert.deepEqual(me.providers, { password: false, discord: true });

  let r = await post(`${base}/api/auth/register`, { pseudo: 'Alice', password: 'secret1' });
  assert.equal(r.status, 404);
  assert.match((await r.json()).error, /Discord/);
  r = await post(`${base}/api/auth/login`, { pseudo: 'Alice', password: 'secret1' });
  assert.equal(r.status, 404);

  // Depart OAuth : redirection vers Discord avec la bonne redirection retour et un etat en cookie.
  r = await fetch(`${base}/api/auth/discord`, { redirect: 'manual' });
  assert.equal(r.status, 302);
  const to = new URL(r.headers.get('location'));
  assert.equal(to.origin, 'https://discord.com');
  assert.equal(to.searchParams.get('client_id'), '123');
  assert.equal(to.searchParams.get('scope'), 'identify');
  assert.equal(to.searchParams.get('redirect_uri'), 'https://podium.example/api/auth/discord/callback');
  const state = to.searchParams.get('state');
  assert.ok(state && state.length >= 16);
  const cookie = (r.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('podium_oauth='));
  assert.ok(cookie && cookie.includes(state), 'etat pose en cookie');

  // Retour avec un etat qui ne correspond pas : refuse, renvoye vers la page de connexion avec le motif.
  r = await fetch(`${base}/api/auth/discord/callback?code=x&state=autre`, { redirect: 'manual', headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /^\/connexion\?erreur=/);
});

// Discord configure mais mot de passe rouvert explicitement.
await withServer({ DISCORD_CLIENT_ID: '123', DISCORD_CLIENT_SECRET: 'abc', PASSWORD_LOGIN: '1' }, async (base) => {
  const me = await (await fetch(`${base}/api/auth/me`)).json();
  assert.deepEqual(me.providers, { password: true, discord: true });
  const r = await post(`${base}/api/auth/register`, { pseudo: 'Alice', password: 'secret1' });
  assert.equal(r.status, 201);
});

// Sans Discord : mode developpement, mot de passe actif, pas de bouton Discord.
await withServer({}, async (base) => {
  const me = await (await fetch(`${base}/api/auth/me`)).json();
  assert.deepEqual(me.providers, { password: true, discord: false });
  const r = await fetch(`${base}/api/auth/discord`, { redirect: 'manual' });
  assert.equal(r.status, 404);
});

console.log('auth-modes : OK');

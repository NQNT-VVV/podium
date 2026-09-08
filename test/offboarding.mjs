// Depart d'un compte : suppression en libre-service, anonymisation des parties,
// purge automatique des inactifs. Modules charges directement, base temporaire.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dataDir = mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir(), 'podium-off-'));
process.env.DATA_DIR = dataDir;
process.env.SSO_SECRET = 'off';
process.env.INACTIVE_ACCOUNT_DAYS = '30';

try {
  const repo = require('../server/repo.js');
  const auth = require('../server/auth.js');
  const ingest = require('../server/ingest.js');
  const scheduler = require('../server/scheduler.js');
  const { sha256 } = require('../server/util.js');
  require('../server/seed.js').run();

  const alice = auth.register({ pseudo: 'Alice', password: 'secret1' }); // admin
  const bob = auth.register({ pseudo: 'Bob', password: 'secret2' });
  const carol = auth.register({ pseudo: 'Carol', password: 'secret3' });
  const game = repo.gameBySlug('refrain');
  repo.setGameKey('refrain', sha256('k'));

  ingest.ingest(repo.gameBySlug('refrain'), {
    matchId: 'm1', players: [
      { pid: alice.id, nickname: 'Alice', score: 10, rank: 1 }, { pid: carol.id, nickname: 'Carol', score: 5, rank: 2 }, { pid: null, nickname: 'Invite', score: 1, rank: 3 },
    ],
  });
  assert.ok(repo.rating(carol.id, game.slug), 'Carol est cotee');

  // Export : tout y est.
  const dump = auth.exportAccount(repo.userById(carol.id));
  assert.equal(dump.account.pseudo, 'Carol');
  assert.equal(dump.matches.length, 1);
  assert.equal(dump.ratings[0].game, 'refrain');

  // Suppression : confirmation exigee, puis anonymisation.
  assert.throws(() => auth.deleteAccount(repo.userById(carol.id), { confirm: 'carole' }), /Retape/);
  auth.deleteAccount(repo.userById(carol.id), { confirm: 'CAROL' });
  assert.equal(repo.userById(carol.id), null);
  assert.equal(repo.rating(carol.id, game.slug), null, 'cote partie avec le compte');
  const players = repo.matchPlayers('refrain:m1');
  const gone = players.find((p) => p.rank === 2);
  assert.equal(gone.userId, null);
  assert.equal(gone.nickname, 'Joueur parti');
  assert.equal(gone.avatar, '');
  assert.equal(players.find((p) => p.rank === 1).userId, alice.id, 'les autres joueurs restent rattaches');
  assert.equal(repo.matchById('refrain:m1').playersCount, 3, 'la partie reste entiere');

  // Purge des inactifs : Bob dort depuis 40 jours, Alice (admin) aussi mais est epargnee.
  const old = Date.now() - 40 * 86400000;
  repo.db.prepare('UPDATE user SET last_seen_at = ? WHERE id IN (?, ?)').run(old, bob.id, alice.id);
  assert.equal(scheduler.purgeInactive(), 1);
  assert.equal(repo.userById(bob.id), null);
  assert.ok(repo.userById(alice.id), 'l’administrateur reste');
  assert.equal(scheduler.purgeInactive(), 0, 'idempotent');

  console.log('offboarding : OK');
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

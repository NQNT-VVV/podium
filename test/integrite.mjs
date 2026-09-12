// Integrite du classement. Ce qui se verifie ici est ce qui ne se voit pas a
// l'oeil : un compte compte une fois, un rang ne sort pas du plateau, deux
// cotes egales donnent le meme rang partout, et une partie acceptee apparait.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const base = process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir();
const dataDir = mkdtempSync(path.join(base, 'podium-int-'));
process.env.DATA_DIR = dataDir;
process.env.SSO_SECRET = 'int';

let passed = 0;
const checks = [];
const test = (name, fn) => checks.push([name, fn]);

try {
  const repo = require('../server/repo.js');
  const auth = require('../server/auth.js');
  const ingest = require('../server/ingest.js');
  const rating = require('../server/rating.js');
  const config = require('../server/config.js');
  const { sha256 } = require('../server/util.js');
  require('../server/seed.js').run();

  const alice = auth.register({ pseudo: 'Alice', password: 'secret1' });
  const bob = auth.register({ pseudo: 'Bob', password: 'secret2' });
  const carol = auth.register({ pseudo: 'Carol', password: 'secret3' });
  repo.setGameKey('refrain', sha256('k'));
  const jeu = () => repo.gameBySlug('refrain');
  const saison = (id) => repo.userSeason(id, 0, Date.now() + 86400000).points || 0;

  /* ------------------- un compte, une part ------------------- */

  test('un meme compte inscrit deux fois n’encaisse qu’une part', () => {
    ingest.ingest(jeu(), {
      matchId: 'double', players: [
        { pid: alice.id, nickname: 'Alice', score: 30, rank: 1 },
        { pid: alice.id, nickname: 'Alice (2e telephone)', score: 20, rank: 2 },
        { pid: bob.id, nickname: 'Bob', score: 10, rank: 3 },
      ],
    });
    // Premiere sur trois : 110 points. Sa seconde ligne ne doit rien ajouter.
    assert.equal(saison(alice.id), 110, 'la seconde inscription ne rapporte rien');
    const lignes = repo.matchPlayers('refrain:double').filter((p) => p.userId === alice.id);
    assert.equal(lignes.length, 2, 'les deux lignes restent : la partie s’est jouee ainsi');
    assert.equal(lignes.filter((p) => p.points > 0).length, 1, 'une seule porte des points');
  });

  /* ------------------- le rang tient dans le plateau ------------------- */

  test('un rang au-dela du plateau est refuse a l’entree', () => {
    assert.throws(() => ingest.ingest(jeu(), {
      matchId: 'hors-plateau', players: [
        { pid: bob.id, nickname: 'Bob', score: 1, rank: 1 },
        { pid: carol.id, nickname: 'Carol', score: 0, rank: 50 },
      ],
    }), /rank 50 au-dela/);
  });

  test('et le calcul, lui aussi, ramene le rang dans le plateau', () => {
    assert.equal(rating.seasonPoints(50, 2), 10, 'dernier au pire, jamais negatif');
    assert.equal(rating.seasonPoints(1, 2), 110);
    assert.equal(rating.seasonPoints(0, 2), 110, 'un rang nul vaut le premier');
    assert.ok(rating.seasonPoints(99, 8) >= 0);
  });

  /* ------------------- le classement ne compte pas les zeros ------------------- */

  test('qui n’a que des parties non classees ne figure pas au classement de saison', () => {
    // Un seul joueur : la partie n'est pas classee, elle ne rapporte rien.
    ingest.ingest(jeu(), { matchId: 'solo', players: [{ pid: carol.id, nickname: 'Carol', score: 99, rank: 1 }] });
    assert.equal(saison(carol.id), 0, 'une partie solo ne rapporte rien');
    const rows = repo.seasonLadder(0, Date.now() + 86400000, 100);
    assert.ok(!rows.some((r) => r.id === carol.id), 'et elle n’apparait pas au classement');
    assert.ok(rows.some((r) => r.id === alice.id), 'ceux qui ont des points y sont');
  });

  /* ------------------- a cote egale, meme rang ------------------- */

  test('le classement d’un jeu et la page d’un joueur donnent le meme rang', () => {
    const api = require('../server/api.js');
    const placement = config.rating.placementMatches;
    // Deux cotes rigoureusement egales, au-dela des parties de placement.
    for (const id of [bob.id, carol.id]) {
      repo.upsertRating({ userId: id, gameSlug: 'refrain', rating: 1000, matches: placement + 5, wins: 1, podiums: 1, peak: 1000, updatedAt: Date.now() });
    }
    repo.upsertRating({ userId: alice.id, gameSlug: 'refrain', rating: 1200, matches: placement + 5, wins: 5, podiums: 5, peak: 1200, updatedAt: Date.now() });

    const ladder = api.ladderView('refrain');
    const egaux = ladder.filter((r) => r.rating === 1000);
    assert.equal(egaux.length, 2, 'les deux ex aequo sont la');
    assert.equal(egaux[0].pos, egaux[1].pos, 'meme cote, meme rang');
    for (const r of egaux) {
      assert.equal(r.pos, repo.gameRankOf('refrain', 1000, placement), 'et c’est celui que voit leur profil');
    }
    assert.equal(ladder.find((r) => r.rating === 1200).pos, 1, 'la premiere reste premiere');
  });

  /* ------------------- ce qui est accepte apparait ------------------- */

  test('une partie deposee dans l’heure de grace figure au classement du defi', () => {
    const challenges = require('../server/challenges/index.js');
    const now = Date.now();
    const ch = challenges.createCustom({
      title: 'Fenetre', gameSlug: 'refrain', kind: 'mode', mode: 'daily', metric: 'best_score',
      startsAt: now - 2 * 86400000, endsAt: now - 1800000, // close il y a trente minutes
    }, alice.id);

    // Jouee vingt minutes apres la cloture : l'ingestion l'accepte.
    const joue = ch.endsAt + 20 * 60000;
    ingest.ingest(jeu(), {
      matchId: 'retard', mode: 'daily', challengeId: ch.id, playedAt: joue,
      players: [{ pid: bob.id, nickname: 'Bob', score: 42, rank: 1 }],
    });
    const m = repo.matchById('refrain:retard');
    assert.equal(m.challengeId, ch.id, 'elle est bien rattachee au defi');

    const board = repo.challengeBoard(ch, 50);
    assert.ok(board.some((r) => r.userId === bob.id), 'et elle apparait : on ne dit pas « recu » pour rien');
  });

  for (const [name, fn] of checks) {
    try { fn(); passed++; console.log(`  ok   ${name}`); } catch (err) {
      console.error(`  FAIL ${name}\n       ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${checks.length} verifications passees`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

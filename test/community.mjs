// Salon, avis et reporting. Ce qui se verifie ici : qu'on ne peut pas noyer le
// salon, qu'un message efface se sait, que la note resiste au depart de son
// auteur alors que ses mots partent avec lui, et que la relecture ne ment pas.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const base = process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir();
const dataDir = mkdtempSync(path.join(base, 'podium-comm-'));
process.env.DATA_DIR = dataDir;
process.env.SSO_SECRET = 'comm';
process.env.CHAT_PER_HOUR = '5';
process.env.FEEDBACK_PER_DAY = '3';

const DAY = 86400000;
let passed = 0;
const checks = [];
const test = (name, fn) => checks.push([name, fn]);

function refuse(fn, needle) {
  try { fn(); } catch (err) {
    if (needle) assert.ok(String(err.message).includes(needle), `message « ${err.message} » ne contient pas « ${needle} »`);
    return err;
  }
  assert.fail('aucun refus');
}

try {
  const repo = require('../server/repo.js');
  const auth = require('../server/auth.js');
  const config = require('../server/config.js');
  const community = require('../server/community.js');
  require('../server/seed.js').run();

  const patron = auth.register({ pseudo: 'Patron', password: 'secret1' }); // premier compte : admin
  const alice = auth.register({ pseudo: 'Alice', password: 'secret2' });
  const bob = auth.register({ pseudo: 'Bob', password: 'secret3' });
  // Un compte dedie au quota : sinon la rafale mange la part des autres tests.
  const rafale = auth.register({ pseudo: 'Rafale', password: 'secret4' });
  const A = () => repo.userById(alice.id);
  const B = () => repo.userById(bob.id);
  const R = () => repo.userById(rafale.id);
  const ADMIN = () => repo.userById(patron.id);

  assert.equal(ADMIN().role, 'admin', 'le premier compte tient la maison');

  const t0 = Date.now();
  /*
   * Poste sans se cogner aux garde-fous qu'on ne teste pas ici.
   *
   * Chaque message avance d'une heure : le delai entre deux messages et le
   * quota horaire ont chacun leur test, et ils n'ont pas a se declencher dans
   * les autres — un test qui echoue pour une raison qui n'est pas la sienne
   * ne dit plus rien.
   */
  let horloge = t0;
  const dire = (user, texte) => { horloge += 3700000; return community.postChat(user, texte, horloge); };

  /* ---------------------------- salon --------------------------- */

  test('un message poste apparait dans le fil, signe de son compte', () => {
    const m = dire(A(), 'Bonsoir tout le monde');
    assert.equal(m.body, 'Bonsoir tout le monde');
    assert.equal(m.pseudo, 'Alice');
    assert.equal(m.deleted, false);
    const { messages } = community.chatSince(0);
    assert.ok(messages.some((x) => x.id === m.id));
  });

  test('le pseudo vient du compte, jamais de ce qu’on envoie', () => {
    const m = dire(B(), 'Salut');
    assert.equal(m.pseudo, 'Bob');
    assert.equal(m.userId, bob.id);
  });

  test('un message vide n’a rien a dire', () => {
    refuse(() => community.postChat(A(), '   \n\n  ', horloge + 10000), 'vide');
  });

  test('sans compte, on lit mais on ne parle pas', () => {
    refuse(() => community.postChat(null, 'coucou'), 'Connectez-vous');
  });

  test('deux messages colles : le second attend son tour', () => {
    const t = horloge + 60000;
    community.postChat(A(), 'Premier', t);
    refuse(() => community.postChat(A(), 'Second', t + 500), 'seconde');
    horloge = t + 500;
  });

  test('parler beaucoup en une heure finit par etre refuse', () => {
    // CHAT_PER_HOUR vaut 5 ici, et ce compte ne sert qu'a cela.
    let t = horloge;
    for (let i = 0; i < 5; i++) { t += config.limits.chatGapMs; community.postChat(R(), `Rafale ${i}`, t); }
    t += config.limits.chatGapMs;
    refuse(() => community.postChat(R(), 'Une de trop', t), 'beaucoup parle');
  });

  test('un message trop long est ramene a la borne, pas refuse', () => {
    const m = dire(A(), 'x'.repeat(config.limits.chatLength + 400));
    assert.equal(m.body.length, config.limits.chatLength);
  });

  test('les rafales de lignes vides sont ecrasees', () => {
    const m = dire(A(), 'Debut\n\n\n\n\n\nFin');
    assert.equal(m.body, 'Debut\n\nFin');
  });

  test('on retire son propre message, et il se sait efface', () => {
    const m = dire(A(), 'A retirer');
    const apres = community.removeChat(A(), m.id);
    assert.equal(apres.deleted, true);
    assert.equal(apres.body, '');
    assert.equal(apres.pseudo, null, 'un message efface ne designe plus personne');
  });

  test('le message d’un autre ne se retire pas', () => {
    const m = dire(A(), 'Le mien');
    refuse(() => community.removeChat(B(), m.id), 'pas le votre');
  });

  test('un administrateur modere, lui', () => {
    const m = dire(A(), 'A moderer');
    assert.equal(community.removeChat(ADMIN(), m.id).deleted, true);
  });

  test('le fil transmet les disparitions, sinon la page garderait l’affiche', () => {
    const m = dire(A(), 'Ephemere');
    const avant = community.chatSince(m.id - 1).cursor;
    community.removeChat(A(), m.id);
    const { messages } = community.chatSince(m.id - 1);
    const vu = messages.find((x) => x.id === m.id);
    assert.ok(vu, 'le message efface reste dans le fil');
    assert.equal(vu.deleted, true);
    assert.equal(vu.body, '');
    assert.ok(avant >= m.id);
  });

  test('le curseur ne rend que la suite', () => {
    const m = dire(A(), 'Repere');
    const suite = community.chatSince(m.id);
    assert.ok(suite.messages.every((x) => x.id > m.id), 'rien de deja lu');
    const n = dire(B(), 'Apres le repere');
    assert.ok(community.chatSince(m.id).messages.some((x) => x.id === n.id));
  });

  test('le salon oublie ce qui a passe l’age convenu', () => {
    const vieux = dire(A(), 'Vieux message');
    repo.db.prepare('UPDATE chat_message SET created_at = ? WHERE id = ?')
      .run(Date.now() - (config.limits.chatKeepDays + 1) * DAY, vieux.id);
    assert.ok(community.purgeChat() >= 1);
    assert.equal(repo.chatById(vieux.id), null);
  });

  /* ---------------------------- avis ---------------------------- */

  test('un avis porte une note et un texte', () => {
    const f = community.postFeedback(A(), { score: 4, body: 'Ca tourne bien', page: '/classement' });
    assert.equal(f.score, 4);
    assert.equal(f.kind, 'avis');
    assert.equal(f.status, 'nouveau');
    assert.equal(f.page, '/classement');
  });

  test('la note reste entre 1 et 5', () => {
    refuse(() => community.postFeedback(A(), { score: 0 }), '1 a 5');
    refuse(() => community.postFeedback(A(), { score: 9 }), '1 a 5');
  });

  test('un signalement n’a pas besoin de note, mais doit decrire', () => {
    const f = community.postFeedback(B(), { kind: 'bug', body: 'Le bouton ne repond pas' });
    assert.equal(f.score, null);
    assert.equal(f.kind, 'bug');
    refuse(() => community.postFeedback(B(), { kind: 'bug' }), 'quelques mots');
  });

  test('ni note ni texte : il n’y a rien a compter', () => {
    refuse(() => community.postFeedback(A(), {}), 'Mettez une note');
  });

  test('la page gardee est un chemin, jamais un domaine', () => {
    const f = community.postFeedback(A(), { score: 5, page: 'https://podium.danwalex.com/defis?x=1' });
    assert.equal(f.page, '/defis?x=1');
  });

  test('on ne depose pas dix avis par jour', () => {
    const t = Date.now() + 10 * DAY;
    for (let i = 0; i < 3; i++) community.postFeedback(B(), { score: 3, body: `Retour ${i}` }, t);
    refuse(() => community.postFeedback(B(), { score: 3, body: 'Encore' }, t), 'a demain');
  });

  test('chacun retrouve ce qu’il a deja dit', () => {
    const miens = community.myFeedback(A());
    assert.ok(miens.length > 0);
    assert.ok(miens.every((f) => f.userId === alice.id));
  });

  test('l’equipe suit un avis : nouveau, lu, traite', () => {
    const f = community.postFeedback(A(), { kind: 'idee', body: 'Un mode duo' });
    const lu = community.setFeedbackStatus(ADMIN(), f.id, { status: 'lu' });
    assert.equal(lu.status, 'lu');
    const traite = community.setFeedbackStatus(ADMIN(), f.id, { status: 'traite', note: 'Prevu pour la saison 2' });
    assert.equal(traite.status, 'traite');
    assert.equal(traite.note, 'Prevu pour la saison 2');
    assert.equal(traite.handledBy, patron.id);
    refuse(() => community.setFeedbackStatus(ADMIN(), f.id, { status: 'perdu' }), 'Etat inconnu');
  });

  /* -------------------------- reporting ------------------------- */

  test('la relecture rend la moyenne et sa repartition', () => {
    const r = community.reporting({ days: 30 });
    assert.equal(r.score.spread.length, 5, 'les cinq notes, meme a zero');
    const somme = r.score.spread.reduce((t, c) => t + c.n, 0);
    assert.equal(somme, r.score.count, 'la repartition et le compte disent la meme chose');
    assert.ok(r.score.average > 0 && r.score.average <= 5);
  });

  test('la courbe est continue : un jour sans avis vaut zero, pas un trou', () => {
    const r = community.reporting({ days: 7 });
    assert.equal(r.daily.length, 8, 'sept jours revolus plus celui qui court');
    assert.ok(r.daily.some((d) => d.n === 0), 'les jours vides sont la');
    for (let i = 1; i < r.daily.length; i++) {
      assert.equal(r.daily[i].at - r.daily[i - 1].at, DAY, 'un jour, puis le suivant');
    }
  });

  test('la relecture separe les natures et les etats', () => {
    const r = community.reporting({ days: 365 });
    assert.ok(r.kinds.bug.n >= 1);
    assert.ok(r.kinds.avis.n >= 1);
    assert.ok(r.statuses.traite >= 1);
    assert.ok(r.statuses.nouveau >= 1);
  });

  test('le filtre porte sur la liste, jamais sur la mesure', () => {
    const tout = community.reporting({ days: 365 });
    const bugs = community.reporting({ days: 365, kind: 'bug' });
    assert.ok(bugs.items.every((f) => f.kind === 'bug'));
    assert.ok(bugs.total < tout.total, 'la liste se reduit');
    assert.deepEqual(bugs.score, tout.score, 'la moyenne du site ne depend pas du filtre');
  });

  /* ------------------------ depart d’un compte ------------------ */

  test('en partant, on emporte ses mots et on laisse sa note', () => {
    const t = Date.now() + 40 * DAY;
    const dit = community.postChat(B(), 'Je passais par la', t);
    const avis = community.postFeedback(B(), { score: 2, body: 'Adresse trop petite', page: '/moi' }, t);

    const avant = community.reporting({ days: 365 }).score.count;
    auth.deleteAccount(repo.userById(bob.id), { confirm: 'BOB' });

    assert.equal(repo.userById(bob.id), null);
    assert.equal(repo.chatById(dit.id), null, 'ses messages partent avec lui');

    const reste = repo.feedbackById(avis.id);
    assert.ok(reste, 'l’avis reste');
    assert.equal(reste.score, 2, 'la note reste : c’est elle qui fait la courbe');
    assert.equal(reste.body, '', 'le texte part');
    assert.equal(reste.page, '', 'la page aussi');
    assert.equal(reste.userId, null, 'et il ne designe plus personne');
    assert.equal(community.reporting({ days: 365 }).score.count, avant, 'la mesure n’est pas reecrite');
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

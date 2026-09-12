'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/lib/client';
import { fmtAgo, fmtDate } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { AdminOverview, Challenge, Game } from '@/lib/types';

const EMPTY_GAME = { slug: '', name: '', tagline: '', description: '', emoji: '🎮', color: '#8b5cf6', url: '', status: 'live', sort: 0, modes: '[]' };

function GameForm({ initial, onDone }: { initial: Partial<Game> | null; onDone: () => void }) {
  const isNew = !initial;
  const [f, setF] = useState(() => initial
    ? { ...EMPTY_GAME, ...initial, modes: JSON.stringify(initial.modes || [], null, 2) }
    : { ...EMPTY_GAME });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let modes: unknown;
      try { modes = JSON.parse(f.modes || '[]'); } catch { throw new Error('Modes : JSON invalide.'); }
      const body = { ...f, modes, sort: Number(f.sort) || 0 };
      if (isNew) await api('POST', '/api/admin/games', body);
      else await api('PATCH', `/api/admin/games/${f.slug}`, body);
      toast(isNew ? 'JEU AJOUTE · OFFICES CREES' : 'JEU MIS A JOUR', 'ok');
      onDone();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>SLUG · IMMUABLE</span><input className="input" value={f.slug} onChange={(e) => set('slug', e.target.value)} disabled={!isNew} required pattern="[a-z0-9][a-z0-9-]{1,30}" placeholder="ex. puzzle" /></label>
        <label className="field"><span>NOM</span><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></label>
        <label className="field"><span>ICONE</span><input className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={8} /></label>
        <label className="field"><span>COULEUR · IGNOREE PAR LE THEME</span><input className="input" type="color" value={f.color} onChange={(e) => set('color', e.target.value)} style={{ padding: 6, height: 48 }} /></label>
        <label className="field"><span>URL PUBLIQUE</span><input className="input" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></label>
        <label className="field"><span>STATUT</span>
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="live">EN LIGNE</option><option value="soon">BIENTOT</option><option value="off">MASQUE</option>
          </select>
        </label>
        <label className="field"><span>ORDRE</span><input className="input" type="number" value={f.sort} onChange={(e) => set('sort', e.target.value)} /></label>
      </div>
      <label className="field"><span>ACCROCHE</span><input className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} /></label>
      <label className="field"><span>DESCRIPTION</span><textarea className="input" value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={1000} /></label>
      <label className="field">
        <span>MODES (JSON) · UN OFFICE PAR PERIODE, AVEC SA GRAINE</span>
        <textarea className="input" value={f.modes} onChange={(e) => set('modes', e.target.value)} spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, minHeight: 120 }} />
        <span className="hint">{'Ex. [{ "id": "daily", "label": "Musique du jour", "emoji": "🎵", "period": "daily", "metric": "best_score" }] — period : daily | weekly | none ; metric : wins, podiums, matches, points, best_score, score_sum.'}</span>
      </label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy}>{isNew ? 'AJOUTER LE JEU' : 'ENREGISTRER'}</button>
        <button className="btn ghost" type="button" onClick={onDone}>ANNULER</button>
      </div>
    </form>
  );
}

function ChallengeForm({ games, metrics, onDone }: { games: Game[]; metrics: string[]; onDone: () => void }) {
  const [f, setF] = useState({ title: '', description: '', emoji: '🎯', gameSlug: '', kind: 'auto', mode: '', metric: 'wins', startsAt: '', endsAt: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('POST', '/api/admin/challenges', {
        ...f, gameSlug: f.gameSlug || null, mode: f.mode || null, period: 'custom',
        startsAt: f.startsAt ? new Date(f.startsAt).getTime() : undefined, endsAt: f.endsAt ? new Date(f.endsAt).getTime() : undefined,
      });
      toast('OFFICE CREE', 'ok');
      onDone();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>TITRE</span><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} required maxLength={80} /></label>
        <label className="field"><span>ICONE</span><input className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={8} /></label>
        <label className="field"><span>JEU</span>
          <select className="input" value={f.gameSlug} onChange={(e) => set('gameSlug', e.target.value)}>
            <option value="">TOUS LES JEUX</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.emoji} {g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>NATURE</span>
          <select className="input" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="auto">AUTO · CALCULE DES PARTIES</option><option value="mode">MODE · IMPLEMENTE PAR LE JEU</option>
          </select>
        </label>
        <label className="field"><span>CRITERE</span>
          <select className="input" value={f.metric} onChange={(e) => set('metric', e.target.value)}>
            {metrics.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="field"><span>MODE DU JEU · FACULTATIF</span><input className="input" value={f.mode} onChange={(e) => set('mode', e.target.value)} placeholder="ex. buzzer" /></label>
        <label className="field"><span>DEBUT</span><input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></label>
        <label className="field"><span>FIN</span><input className="input" type="datetime-local" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></label>
      </div>
      <label className="field"><span>DESCRIPTION</span><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={500} /></label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy}>CREER L’OFFICE</button>
        <button className="btn ghost" type="button" onClick={onDone}>ANNULER</button>
      </div>
    </form>
  );
}

export function AdminPanel({ data }: { data: AdminOverview }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // slug, ou 'new'
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [key, setKey] = useState<{ slug: string; key: string } | null>(null);

  const refresh = () => { setEditing(null); setCreatingChallenge(false); router.refresh(); };

  async function rotateKey(g: Game) {
    if (g.hasKey && !confirm(`REGENERER LA CLE DE ${g.name.toUpperCase()} ? L’ANCIENNE CESSERA DE FONCTIONNER IMMEDIATEMENT.`)) return;
    try {
      const r = await api<{ key: string }>('POST', `/api/admin/games/${g.slug}/key`);
      setKey({ slug: g.slug, key: r.key });
      router.refresh();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    }
  }

  async function removeGame(g: Game) {
    if (!confirm(`SUPPRIMER ${g.name.toUpperCase()} ET TOUT SON HISTORIQUE ? IRREVERSIBLE.`)) return;
    try { await api('DELETE', `/api/admin/games/${g.slug}`); toast('JEU SUPPRIME', 'ok'); refresh(); } catch (err) { toast((err as Error).message.toUpperCase(), 'err'); }
  }

  async function removeChallenge(c: Challenge) {
    if (!confirm(`SUPPRIMER L’OFFICE « ${c.title.toUpperCase()} » ?`)) return;
    try { await api('DELETE', `/api/admin/challenges/${c.id}`); toast('OFFICE SUPPRIME', 'ok'); refresh(); } catch (err) { toast((err as Error).message.toUpperCase(), 'err'); }
  }

  async function runScheduler() {
    try {
      const r = await api<{ created: number; closed: number }>('POST', '/api/admin/challenges/run');
      toast(`${r.created} OFFICE(S) CREE(S) · ${r.closed} CLOS`, 'ok');
      router.refresh();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    }
  }

  return (
    <>
      <section className="block">
        <div className="block-head">
          <h2 className="section-title">JEUX</h2>
          <button className="btn sm primary" type="button" onClick={() => setEditing('new')}>AJOUTER UN JEU</button>
        </div>
        {editing === 'new' && <div className="card pad"><GameForm initial={null} onDone={refresh} /></div>}
        <div className="admin-list">
          {data.games.map((g) => (
            <div key={g.slug} className="col" style={{ gap: 8 }}>
              <div className="admin-row">
                
                <div className="grow">
                  <b>{g.name.toUpperCase()} <span className="faint">· {g.slug} · {g.status.toUpperCase()}</span></b>
                  <small>{(g.url || 'SANS URL').toUpperCase()} · {g.stats?.matches ?? 0} PARTIES · {g.modes.length} MODE(S) · CLE {g.hasKey ? 'DEFINIE' : 'ABSENTE'}</small>
                </div>
                <button className="btn xs" type="button" onClick={() => setEditing(editing === g.slug ? null : g.slug)}>MODIFIER</button>
                <button className="btn xs" type="button" onClick={() => rotateKey(g)}>{g.hasKey ? 'REGENERER LA CLE' : 'GENERER LA CLE'}</button>
                <button className="btn xs danger" type="button" onClick={() => removeGame(g)}>SUPPRIMER</button>
              </div>
              {key?.slug === g.slug && (
                <div className="card pad col" style={{ gap: 10 }}>
                  <b>CLE D’INGESTION · {g.name.toUpperCase()} · AFFICHEE UNE SEULE FOIS</b>
                  <div className="keybox">{key.key}</div>
                  <span className="hint">
                    A METTRE DANS <code>PODIUM_GAME_KEY</code> COTE JEU (SECRET <code>podium-integration</code> EN K8S). SEUL SON HACHAGE EST CONSERVE ICI.
                  </span>
                  <div><button className="btn xs" type="button" onClick={() => setKey(null)}>J’AI COPIE LA CLE</button></div>
                </div>
              )}
              {editing === g.slug && <div className="card pad"><GameForm initial={g} onDone={refresh} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2 className="section-title">OFFICES</h2>
          <button className="btn sm" type="button" onClick={runScheduler} title="Cree les defis manquants et clot ceux qui sont termines">LANCER LE PLANIFICATEUR</button>
          <button className="btn sm primary" type="button" onClick={() => setCreatingChallenge(true)}>OFFICE EXCEPTIONNEL</button>
        </div>
        {creatingChallenge && <div className="card pad"><ChallengeForm games={data.games} metrics={data.metrics} onDone={refresh} /></div>}
        <div className="admin-list">
          {[...data.challenges.active, ...data.challenges.upcoming].map((c) => (
            <div key={c.id} className="admin-row">
              
              <div className="grow">
                <b>{c.title.toUpperCase()} <span className="faint">· {c.game ? c.game.name.toUpperCase() : 'GLOBAL'} · {c.kind.toUpperCase()}{c.mode ? ` (${c.mode.toUpperCase()})` : ''} · {c.metric.toUpperCase()}</span></b>
                <small>{c.state === 'active' ? 'EN COURS' : 'A VENIR'} · {fmtDate(c.startsAt, true)} → {fmtDate(c.endsAt, true)} · {c.slug}</small>
              </div>
              <button className="btn xs danger" type="button" onClick={() => removeChallenge(c)}>SUPPRIMER</button>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2 className="section-title">JOURNAL D’INGESTION</h2><span className="faint" style={{ fontSize: 12.5 }}>SUJETS {data.users} · FUSEAU {data.timeZone.toUpperCase()}</span></div>
        {data.logs.length ? (
          <div className="log">
            {data.logs.map((l) => (
              <div key={l.id} className={`line ${l.status}`}>
                <span className="st">{l.status}</span>
                <span>{l.game_slug || '—'}</span>
                <span className="ellipsis grow">{l.external_id || ''} {l.detail || ''}</span>
                <span>{fmtAgo(l.at)}</span>
              </div>
            ))}
          </div>
        ) : <div className="empty"><span>AUCUN RESULTAT RECU</span></div>}
      </section>
    </>
  );
}

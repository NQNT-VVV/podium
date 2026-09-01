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
      toast(isNew ? 'Jeu ajoute. Ses defis de la semaine sont crees.' : 'Jeu mis a jour.', 'ok');
      onDone();
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Slug (identifiant, immuable)</span><input className="input" value={f.slug} onChange={(e) => set('slug', e.target.value)} disabled={!isNew} required pattern="[a-z0-9][a-z0-9-]{1,30}" placeholder="ex. puzzle" /></label>
        <label className="field"><span>Nom</span><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></label>
        <label className="field"><span>Emoji</span><input className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={8} /></label>
        <label className="field"><span>Couleur</span><input className="input" type="color" value={f.color} onChange={(e) => set('color', e.target.value)} style={{ padding: 6, height: 48 }} /></label>
        <label className="field"><span>URL publique</span><input className="input" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></label>
        <label className="field"><span>Statut</span>
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="live">En ligne</option><option value="soon">Bientot</option><option value="off">Masque</option>
          </select>
        </label>
        <label className="field"><span>Ordre</span><input className="input" type="number" value={f.sort} onChange={(e) => set('sort', e.target.value)} /></label>
      </div>
      <label className="field"><span>Accroche</span><input className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} /></label>
      <label className="field"><span>Description</span><textarea className="input" value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={1000} /></label>
      <label className="field">
        <span>Modes (JSON) — un defi par periode est cree pour chacun, avec sa graine</span>
        <textarea className="input" value={f.modes} onChange={(e) => set('modes', e.target.value)} spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, minHeight: 120 }} />
        <span className="hint">{'Ex. [{ "id": "daily", "label": "Musique du jour", "emoji": "🎵", "period": "daily", "metric": "best_score" }] — period : daily | weekly | none ; metric : wins, podiums, matches, points, best_score, score_sum.'}</span>
      </label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy}>{isNew ? 'Ajouter le jeu' : 'Enregistrer'}</button>
        <button className="btn ghost" type="button" onClick={onDone}>Annuler</button>
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
      toast('Defi cree.', 'ok');
      onDone();
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Titre</span><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} required maxLength={80} /></label>
        <label className="field"><span>Emoji</span><input className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={8} /></label>
        <label className="field"><span>Jeu</span>
          <select className="input" value={f.gameSlug} onChange={(e) => set('gameSlug', e.target.value)}>
            <option value="">Tous les jeux</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.emoji} {g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Nature</span>
          <select className="input" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="auto">Auto (calcule des parties)</option><option value="mode">Mode (implemente par le jeu)</option>
          </select>
        </label>
        <label className="field"><span>Critere</span>
          <select className="input" value={f.metric} onChange={(e) => set('metric', e.target.value)}>
            {metrics.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="field"><span>Mode du jeu (facultatif)</span><input className="input" value={f.mode} onChange={(e) => set('mode', e.target.value)} placeholder="ex. buzzer" /></label>
        <label className="field"><span>Debut</span><input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></label>
        <label className="field"><span>Fin</span><input className="input" type="datetime-local" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></label>
      </div>
      <label className="field"><span>Description</span><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={500} /></label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy}>Creer le defi</button>
        <button className="btn ghost" type="button" onClick={onDone}>Annuler</button>
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
    if (g.hasKey && !confirm(`Regenerer la cle de ${g.name} ? L’ancienne cessera de fonctionner immediatement.`)) return;
    try {
      const r = await api<{ key: string }>('POST', `/api/admin/games/${g.slug}/key`);
      setKey({ slug: g.slug, key: r.key });
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'err');
    }
  }

  async function removeGame(g: Game) {
    if (!confirm(`Supprimer ${g.name} et tout son historique ? Irreversible.`)) return;
    try { await api('DELETE', `/api/admin/games/${g.slug}`); toast('Jeu supprime.', 'ok'); refresh(); } catch (err) { toast((err as Error).message, 'err'); }
  }

  async function removeChallenge(c: Challenge) {
    if (!confirm(`Supprimer le defi « ${c.title} » ?`)) return;
    try { await api('DELETE', `/api/admin/challenges/${c.id}`); toast('Defi supprime.', 'ok'); refresh(); } catch (err) { toast((err as Error).message, 'err'); }
  }

  async function runScheduler() {
    try {
      const r = await api<{ created: number; closed: number }>('POST', '/api/admin/challenges/run');
      toast(`${r.created} defi(s) cree(s), ${r.closed} clos.`, 'ok');
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'err');
    }
  }

  return (
    <>
      <section className="block">
        <div className="block-head">
          <h2 className="section-title">Jeux</h2>
          <button className="btn sm primary" type="button" onClick={() => setEditing('new')}>+ Ajouter un jeu</button>
        </div>
        {editing === 'new' && <div className="card pad"><GameForm initial={null} onDone={refresh} /></div>}
        <div className="admin-list">
          {data.games.map((g) => (
            <div key={g.slug} className="col" style={{ gap: 8 }}>
              <div className="admin-row">
                <span style={{ fontSize: 26 }} aria-hidden="true">{g.emoji}</span>
                <div className="grow">
                  <b>{g.name} <span className="faint" style={{ fontWeight: 400 }}>· {g.slug} · {g.status}</span></b>
                  <small>{g.url || 'sans URL'} · {g.stats?.matches ?? 0} parties · {g.modes.length} mode(s) · cle {g.hasKey ? 'definie' : 'absente'}</small>
                </div>
                <button className="btn xs" type="button" onClick={() => setEditing(editing === g.slug ? null : g.slug)}>Modifier</button>
                <button className="btn xs" type="button" onClick={() => rotateKey(g)}>{g.hasKey ? 'Regenerer la cle' : 'Generer la cle'}</button>
                <button className="btn xs danger" type="button" onClick={() => removeGame(g)}>Supprimer</button>
              </div>
              {key?.slug === g.slug && (
                <div className="card pad col" style={{ gap: 10 }}>
                  <b>Cle d’ingestion de {g.name} — affichee une seule fois</b>
                  <div className="keybox">{key.key}</div>
                  <span className="hint" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    A mettre dans <code>PODIUM_GAME_KEY</code> cote jeu (Secret <code>podium-integration</code> en k8s). Seul son hachage est conserve ici.
                  </span>
                  <div><button className="btn xs" type="button" onClick={() => setKey(null)}>J’ai copie la cle</button></div>
                </div>
              )}
              {editing === g.slug && <div className="card pad"><GameForm initial={g} onDone={refresh} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2 className="section-title">Defis</h2>
          <button className="btn sm" type="button" onClick={runScheduler} title="Cree les defis manquants et clot ceux qui sont termines">Lancer le planificateur</button>
          <button className="btn sm primary" type="button" onClick={() => setCreatingChallenge(true)}>+ Defi special</button>
        </div>
        {creatingChallenge && <div className="card pad"><ChallengeForm games={data.games} metrics={data.metrics} onDone={refresh} /></div>}
        <div className="admin-list">
          {[...data.challenges.active, ...data.challenges.upcoming].map((c) => (
            <div key={c.id} className="admin-row">
              <span style={{ fontSize: 22 }} aria-hidden="true">{c.emoji}</span>
              <div className="grow">
                <b>{c.title} <span className="faint" style={{ fontWeight: 400 }}>· {c.game ? c.game.name : 'global'} · {c.kind}{c.mode ? ` (${c.mode})` : ''} · {c.metric}</span></b>
                <small>{c.state === 'active' ? 'en cours' : 'a venir'} · {fmtDate(c.startsAt, true)} → {fmtDate(c.endsAt, true)} · {c.slug}</small>
              </div>
              <button className="btn xs danger" type="button" onClick={() => removeChallenge(c)}>Supprimer</button>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Journal d’ingestion</h2><span className="faint" style={{ fontSize: 12.5 }}>{data.users} compte(s) · fuseau {data.timeZone}</span></div>
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
        ) : <div className="empty">Aucun resultat recu pour l’instant.</div>}
      </section>
    </>
  );
}

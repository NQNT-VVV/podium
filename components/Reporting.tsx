'use client';

import { useCallback, useEffect, useState } from 'react';

import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { fmtInt } from '@/lib/hex';
import type { Feedback, FeedbackKind, FeedbackStatus, Reporting as Data } from '@/lib/types';

const FENETRES = [7, 30, 90, 365];
const NATURES: { id: '' | FeedbackKind; label: string }[] = [
  { id: '', label: 'TOUT' },
  { id: 'avis', label: 'AVIS' },
  { id: 'bug', label: 'PROBLEMES' },
  { id: 'idee', label: 'IDEES' },
];
const ETATS: { id: '' | FeedbackStatus; label: string }[] = [
  { id: '', label: 'TOUS' },
  { id: 'nouveau', label: 'RECUS' },
  { id: 'lu', label: 'LUS' },
  { id: 'traite', label: 'TRAITES' },
];
const SUITE: Record<FeedbackStatus, FeedbackStatus> = { nouveau: 'lu', lu: 'traite', traite: 'nouveau' };
const ETAT_LABEL: Record<FeedbackStatus, string> = { nouveau: 'RECU', lu: 'LU', traite: 'TRAITE' };

/**
 * Le volume jour par jour.
 *
 * Des barres, pas une courbe : on compte des retours, et une courbe entre
 * deux jours donnerait a croire qu'il s'est passe quelque chose entre les
 * deux. La serie est continue, les jours vides valent zero.
 */
function Volume({ daily }: { daily: Data['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.n));
  return (
    <div className="rep-volume" role="img" aria-label={`Volume quotidien sur ${daily.length} jours, maximum ${max} par jour`}>
      {daily.map((d) => (
        <span
          key={d.at}
          className={`rep-barre${d.n === 0 ? ' vide' : ''}`}
          style={{ height: `${Math.round((d.n / max) * 100)}%` }}
          title={`${fmtDate(d.at)} — ${d.n} retour${d.n > 1 ? 's' : ''}${d.average !== null ? `, moyenne ${d.average}` : ''}`}
        />
      ))}
    </div>
  );
}

/** La repartition des notes, sous la moyenne. Une moyenne seule cache toujours quelque chose. */
function Repartition({ spread, total }: { spread: Data['score']['spread']; total: number }) {
  return (
    <ul className="rep-spread">
      {[...spread].reverse().map((c) => {
        const part = total ? Math.round((c.n / total) * 100) : 0;
        return (
          <li key={c.score}>
            <span className="rep-spread-note"><Icon name="etoile" />{c.score}</span>
            <span className="rep-spread-piste"><i style={{ transform: `scaleX(${total ? c.n / total : 0})` }} /></span>
            <span className="rep-spread-n tnum">{fmtInt(c.n)}<span className="faint"> · {part}%</span></span>
          </li>
        );
      })}
    </ul>
  );
}

export function Reporting({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [days, setDays] = useState(initial.window.days);
  const [kind, setKind] = useState<'' | FeedbackKind>('');
  const [status, setStatus] = useState<'' | FeedbackStatus>('');
  const [busy, setBusy] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const charger = useCallback(async (q: { days: number; kind: string; status: string }) => {
    setBusy(true);
    try {
      setData(await api<Data>('GET', `/api/admin/reporting?days=${q.days}&kind=${q.kind}&status=${q.status}`));
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }, []);

  // Le premier rendu vient du serveur : on ne recharge qu'a partir du premier
  // changement de filtre, sinon la page ferait deux fois le meme travail.
  const [premier, setPremier] = useState(true);
  useEffect(() => {
    if (premier) { setPremier(false); return; }
    void charger({ days, kind, status });
  }, [days, kind, status, charger, premier]);

  async function avancer(f: Feedback, vers: FeedbackStatus, texte: string) {
    try {
      const { feedback } = await api<{ feedback: Feedback }>('PATCH', `/api/admin/reporting/${f.id}`, { status: vers, note: texte });
      setData((d) => ({
        ...d,
        items: d.items.map((x) => (x.id === feedback.id ? feedback : x)),
        statuses: { ...d.statuses, [f.status]: Math.max(0, d.statuses[f.status] - 1), [vers]: d.statuses[vers] + 1 },
      }));
      setOuvert(null);
      setNote('');
      toast(`Avis ${ETAT_LABEL[vers].toLowerCase()}`, 'ok');
    } catch (err) {
      toast((err as Error).message, 'err');
    }
  }

  const { score, statuses, kinds } = data;
  const maigre = score.count > 0 && score.count < 5;

  return (
    <div className="rep" aria-busy={busy}>
      <div className="seg rep-fenetre" role="group" aria-label="Fenetre d’observation">
        {FENETRES.map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>
            {d === 365 ? 'UN AN' : `${d} JOURS`}
          </button>
        ))}
      </div>

      <div className="rep-tetes">
        <div className="card pad rep-chiffre">
          <span className="meta">NOTE MOYENNE</span>
          <b className="tnum">{score.average === null ? '—' : score.average.toFixed(2)}</b>
          <small className="faint">
            {score.count === 0
              ? 'Aucune note sur la fenetre'
              : `sur ${fmtInt(score.count)} note${score.count > 1 ? 's' : ''}`}
          </small>
          {maigre && (
            <p className="rep-reserve">
              <Icon name="attention" />Trop peu de notes pour que cette moyenne veuille dire quelque chose.
            </p>
          )}
        </div>

        <div className="card pad rep-chiffre">
          <span className="meta">A TRAITER</span>
          <b className="tnum">{fmtInt(statuses.nouveau)}</b>
          <small className="faint">{fmtInt(statuses.lu)} lus · {fmtInt(statuses.traite)} traites</small>
        </div>

        <div className="card pad rep-chiffre">
          <span className="meta">SALON</span>
          <b className="tnum">{fmtInt(data.chat.messages)}</b>
          <small className="faint">messages vivants · oubli a {data.chat.keepDays} jours</small>
        </div>
      </div>

      <div className="rep-deux">
        <section className="card pad">
          <div className="block-head"><h2>REPARTITION DES NOTES</h2></div>
          {score.count === 0
            ? <p className="muted">Aucune note sur cette fenetre.</p>
            : <Repartition spread={score.spread} total={score.count} />}
        </section>

        <section className="card pad">
          <div className="block-head"><h2>VOLUME QUOTIDIEN</h2></div>
          <Volume daily={data.daily} />
          <div className="rep-legende meta">
            <span>{fmtDate(data.window.since)}</span><span className="grow" /><span>AUJOURD’HUI</span>
          </div>
          <ul className="rep-natures">
            {NATURES.filter((n) => n.id).map((n) => {
              const k = kinds[n.id as FeedbackKind];
              return (
                <li key={n.id}>
                  <span className="meta">{n.label}</span>
                  <b className="tnum">{fmtInt(k?.n ?? 0)}</b>
                  {k?.average !== null && k?.average !== undefined && <small className="faint">moy. {k.average}</small>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {data.pages.length > 0 && (
        <section className="card pad">
          <div className="block-head"><h2>PAGES LES PLUS CITEES</h2></div>
          <ul className="rep-pages">
            {data.pages.map((p) => (
              <li key={p.page}><code>{p.page}</code><span className="grow" /><b className="tnum">{fmtInt(p.n)}</b></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card pad">
        <div className="block-head">
          <h2>LES RETOURS</h2>
          <span className="meta">{fmtInt(data.total)} AU FILTRE COURANT</span>
        </div>

        <div className="rep-filtres">
          <div className="seg" role="group" aria-label="Nature">
            {NATURES.map((n) => (
              <button key={n.id || 'tout'} type="button" aria-pressed={kind === n.id} onClick={() => setKind(n.id)}>{n.label}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Etat">
            {ETATS.map((e) => (
              <button key={e.id || 'tous'} type="button" aria-pressed={status === e.id} onClick={() => setStatus(e.id)}>{e.label}</button>
            ))}
          </div>
        </div>

        {data.items.length === 0 ? (
          <div className="empty">
            <Icon name="graphe" size="lg" />
            <p>Rien ne correspond a ce filtre.</p>
          </div>
        ) : (
          <ul className="rep-liste">
            {data.items.map((f) => (
              <li key={f.id} className={`rep-item ${f.status}`}>
                <div className="rep-item-tete">
                  {f.pseudo ? <Avatar emoji={f.avatar || '🙂'} size="sm" /> : <span className="rep-parti" aria-hidden="true" />}
                  <div className="grow">
                    <b>{f.pseudo || 'Compte supprime'}</b>
                    <small className="faint">
                      {fmtDate(f.createdAt, true)}
                      {f.page ? ` · ${f.page}` : ''}
                    </small>
                  </div>
                  {f.score !== null && <span className="rep-item-note"><Icon name="etoile" />{f.score}/5</span>}
                  <span className="meta">{NATURES.find((n) => n.id === f.kind)?.label}</span>
                  <span className={`pill avis-etat ${f.status}`}>{ETAT_LABEL[f.status]}</span>
                </div>

                {f.body ? <p className="rep-item-corps">{f.body}</p> : <p className="muted">Texte retire avec le compte.</p>}
                {f.note && <p className="avis-reponse"><b>REPONSE</b> {f.note}</p>}

                <div className="rep-item-actions">
                  <button className="btn xs" type="button" onClick={() => avancer(f, SUITE[f.status], f.note)}>
                    MARQUER {ETAT_LABEL[SUITE[f.status]]}
                  </button>
                  <button
                    className="btn xs ghost"
                    type="button"
                    aria-expanded={ouvert === f.id}
                    onClick={() => { setOuvert(ouvert === f.id ? null : f.id); setNote(f.note); }}
                  >
                    <Icon name="salon" />REPONDRE
                  </button>
                </div>

                {ouvert === f.id && (
                  <div className="rep-item-reponse">
                    <label className="sr-only" htmlFor={`rep-note-${f.id}`}>Reponse visible par la personne</label>
                    <textarea
                      id={`rep-note-${f.id}`}
                      className="input"
                      rows={3}
                      value={note}
                      maxLength={500}
                      placeholder="Ce que vous en avez fait. La personne le verra sur sa page d’avis."
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="actions">
                      <button className="btn sm primary" type="button" onClick={() => avancer(f, 'traite', note)}>
                        <Icon name="valide" />REPONDRE ET CLORE
                      </button>
                      <button className="btn sm ghost" type="button" onClick={() => { setOuvert(null); setNote(''); }}>ANNULER</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

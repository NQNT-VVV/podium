'use client';

import { useEffect, useState } from 'react';

import { Icon } from './Icon';
import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import type { AvisData, Feedback, FeedbackKind } from '@/lib/types';

const NATURES: { id: FeedbackKind; label: string; aide: string }[] = [
  { id: 'avis', label: 'AVIS', aide: 'Ce que vous pensez du site, en une note et deux lignes.' },
  { id: 'bug', label: 'PROBLEME', aide: 'Quelque chose ne marche pas. Dites ou, et ce que vous attendiez.' },
  { id: 'idee', label: 'IDEE', aide: 'Ce qui manque, ou ce qui serait mieux autrement.' },
];

const ETAT_LABEL: Record<string, string> = { nouveau: 'RECU', lu: 'LU', traite: 'TRAITE' };

/**
 * Cinq crans, au clavier comme au doigt.
 *
 * Un groupe de boutons radio plutot que cinq boutons : les fleches parcourent
 * les crans, la tabulation passe au champ suivant, et un lecteur d'ecran
 * annonce « 3 sur 5 » au lieu de cinq etiquettes sans rapport entre elles.
 */
function Note({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className="note" role="radiogroup" aria-label="Note du site, de 1 a 5">
      {[1, 2, 3, 4, 5].map((n) => {
        const pleine = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5`}
            className={`note-cran${pleine ? ' pleine' : ''}`}
            // Un second appui sur le meme cran retire la note : sans cela, on
            // ne peut plus envoyer un simple signalement une fois qu'on a
            // touche une etoile par curiosite.
            onClick={() => onChange(value === n ? null : n)}
          >
            <Icon name={pleine ? 'etoile' : 'etoileVide'} />
          </button>
        );
      })}
      <span className="note-dit">{value === null ? 'SANS NOTE' : `${value} / 5`}</span>
    </div>
  );
}

export function AvisForm({ initial, page }: { initial: AvisData; page?: string }) {
  const [kind, setKind] = useState<FeedbackKind>('avis');
  const [score, setScore] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Feedback[]>(initial.mine);
  const [depuis, setDepuis] = useState(page || '');

  useEffect(() => {
    /*
     * D'ou l'on vient vaut la moitie d'un rapport de bug.
     *
     * On ne lit le referent que s'il est de chez nous : une page exterieure
     * n'a rien a faire dans nos donnees, et le dire sert autant a la personne
     * qui remplit le formulaire qu'a celle qui le lira.
     */
    if (page || typeof document === 'undefined') return;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === window.location.origin) setDepuis(ref.pathname + ref.search);
    } catch { /* referent illisible : tant pis, le champ reste vide */ }
  }, [page]);

  const nature = NATURES.find((n) => n.id === kind)!;
  const restant = initial.limits.length - body.length;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { feedback } = await api<{ feedback: Feedback }>('POST', '/api/avis', {
        kind, score, body: body.trim(), page: depuis,
      });
      setMine((anciens) => [feedback, ...anciens].slice(0, 5));
      setBody('');
      setScore(null);
      toast('Merci, c’est enregistre.', 'ok');
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avis">
      <form className="card pad form avis-form" onSubmit={envoyer}>
        <div className="tabs tabs-3" role="tablist" aria-label="Nature du retour">
          {NATURES.map((n) => (
            <button
              key={n.id}
              type="button"
              role="tab"
              aria-selected={kind === n.id}
              onClick={() => setKind(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <p className="muted">{nature.aide}</p>

        <div className="field">
          <label htmlFor="avis-note">NOTE DU SITE <span className="faint">— facultative</span></label>
          <Note value={score} onChange={setScore} />
          <small id="avis-note" className="faint">
            Une note suffit pour un avis. Un probleme ou une idee se decrit, avec ou sans note.
          </small>
        </div>

        <div className="field">
          <label htmlFor="avis-texte">{kind === 'avis' ? 'CE QUE VOUS EN DITES' : 'CE QUI SE PASSE'}</label>
          <textarea
            id="avis-texte"
            className="input"
            rows={5}
            value={body}
            maxLength={initial.limits.length}
            placeholder={kind === 'bug'
              ? 'Sur la page des defis, le bouton ne repond pas quand…'
              : 'Ce que vous avez aime, ou pas…'}
            onChange={(e) => setBody(e.target.value)}
          />
          <small className={`faint${restant < 120 ? ' changed' : ''}`}>{restant} caracteres restants</small>
        </div>

        <div className="field">
          <label htmlFor="avis-page">PAGE CONCERNEE <span className="faint">— facultative</span></label>
          <input
            id="avis-page"
            className="input"
            value={depuis}
            maxLength={120}
            placeholder="/defis"
            onChange={(e) => setDepuis(e.target.value)}
          />
        </div>

        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="valide" />ENVOYER
          </button>
        </div>
      </form>

      <aside className="card pad avis-miens">
        <div className="block-head"><h2>CE QUE VOUS AVEZ DEJA DIT</h2></div>
        {mine.length === 0 ? (
          <p className="muted">Rien pour l’instant. Votre premier retour s’affichera ici, avec son suivi.</p>
        ) : (
          <ul className="avis-liste">
            {mine.map((f) => (
              <li key={f.id}>
                <div className="avis-tete">
                  <span className="meta">{NATURES.find((n) => n.id === f.kind)?.label || 'AVIS'}</span>
                  {f.score !== null && <span className="avis-note-dit"><Icon name="etoile" />{f.score}/5</span>}
                  <span className="grow" />
                  <span className={`pill avis-etat ${f.status}`}>{ETAT_LABEL[f.status]}</span>
                </div>
                {f.body && <p>{f.body}</p>}
                <small className="faint">{fmtDate(f.createdAt, true)}{f.page ? ` · ${f.page}` : ''}</small>
                {f.status === 'traite' && f.note && <p className="avis-reponse"><b>REPONSE</b> {f.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import { stamp } from '@/lib/hex';
import { fmtDate } from '@/lib/format';
import type { ChatData, ChatMessage } from '@/lib/types';

/**
 * Le salon.
 *
 * Un fil, un champ. Le suivi se fait par curseur et par sondage : le hub n'a
 * pas de socket, et un salon de cette taille n'en demande pas — quatre
 * secondes de retard sur une conversation a dix ne se voient pas, la ou un
 * canal permanent se paierait en complexite et en connexions ouvertes.
 *
 * Le sondage s'arrete des que l'onglet passe en arriere-plan : un telephone
 * dans une poche n'a aucune raison de parler au serveur.
 */

const SONDAGE_MS = 4000;

/** Regroupe les messages consecutifs d'une meme personne : une voix, un bloc. */
function memeVoix(a: ChatMessage | undefined, b: ChatMessage): boolean {
  if (!a || a.deleted || b.deleted) return false;
  return a.userId === b.userId && b.createdAt - a.createdAt < 5 * 60000;
}

export function Salon({ initial }: { initial: ChatData }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const [retard, setRetard] = useState(false);

  const curseur = useRef(initial.cursor);
  const fil = useRef<HTMLDivElement>(null);
  /*
   * On ne ramene en bas que si on y etait deja.
   *
   * Quelqu'un en train de relire plus haut ne doit pas se faire arracher sa
   * lecture par l'arrivee d'un message.
   */
  const enBas = useRef(true);

  const me = initial.me;

  /** Absorbe une page de messages : les nouveaux s'ajoutent, les effaces remplacent. */
  const absorber = useCallback((recus: ChatMessage[]) => {
    if (!recus.length) return;
    setMessages((anciens) => {
      const parId = new Map(anciens.map((m) => [m.id, m]));
      for (const m of recus) parId.set(m.id, m);
      return [...parId.values()].sort((a, b) => a.id - b.id).slice(-400);
    });
  }, []);

  const relever = useCallback(async () => {
    try {
      const data = await api<ChatData>('GET', `/api/chat?since=${curseur.current}`);
      if (data.cursor > curseur.current) curseur.current = data.cursor;
      absorber(data.messages);
      setRetard(false);
    } catch {
      // Une coupure ne vide pas le fil : on garde ce qu'on a et on le dit.
      setRetard(true);
    }
  }, [absorber]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const demarrer = () => {
      if (timer) return;
      void relever();
      timer = setInterval(relever, SONDAGE_MS);
    };
    const arreter = () => { if (timer) { clearInterval(timer); timer = null; } };
    const surVisibilite = () => (document.hidden ? arreter() : demarrer());

    demarrer();
    document.addEventListener('visibilitychange', surVisibilite);
    return () => { arreter(); document.removeEventListener('visibilitychange', surVisibilite); };
  }, [relever]);

  useEffect(() => {
    const el = fil.current;
    if (el && enBas.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function surDefilement() {
    const el = fil.current;
    if (!el) return;
    enBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const body = texte.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const { message } = await api<{ message: ChatMessage }>('POST', '/api/chat', { body });
      absorber([message]);
      if (message.id > curseur.current) curseur.current = message.id;
      setTexte('');
      enBas.current = true;
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  async function retirer(id: number) {
    try {
      const { message } = await api<{ message: ChatMessage }>('DELETE', `/api/chat/${id}`);
      absorber([message]);
      toast('Message retire', 'ok');
    } catch (err) {
      toast((err as Error).message, 'err');
    }
  }

  const restant = initial.limits.length - texte.length;
  const vus = messages.filter((m) => !m.deleted);

  return (
    <section className="salon">
      <div className="salon-fil" ref={fil} onScroll={surDefilement} role="log" aria-live="polite" aria-label="Messages du salon">
        {vus.length === 0 ? (
          <div className="empty">
            <Icon name="salon" size="lg" />
            <p>Personne n’a encore rien dit. Ouvrez le bal.</p>
          </div>
        ) : (
          vus.map((m, i) => {
            const suite = memeVoix(vus[i - 1], m);
            return (
              <article key={m.id} className={`salon-msg${suite ? ' suite' : ''}`}>
                {suite ? <span className="salon-gouttiere" aria-hidden="true" /> : <Avatar emoji={m.avatar || '🙂'} size="sm" />}
                <div className="salon-corps">
                  {!suite && (
                    <header className="salon-qui">
                      <b>{m.pseudo || 'Joueur parti'}</b>
                      {m.role === 'admin' && <span className="pill">EQUIPE</span>}
                      <time dateTime={new Date(m.createdAt).toISOString()} title={fmtDate(m.createdAt, true)}>{stamp(m.createdAt)}</time>
                    </header>
                  )}
                  <p>{m.body}</p>
                </div>
                {me && (me.id === m.userId || me.role === 'admin') && (
                  <button
                    type="button"
                    className="btn xs icon ghost salon-retirer"
                    title="Retirer ce message"
                    aria-label="Retirer ce message"
                    onClick={() => retirer(m.id)}
                  >
                    <Icon name="croix" />
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>

      {retard && (
        <p className="salon-retard" role="status">
          <Icon name="attention" />Le fil ne se met plus a jour. On reessaie tout seul.
        </p>
      )}

      {me ? (
        <form className="salon-champ" onSubmit={envoyer}>
          <label className="sr-only" htmlFor="salon-texte">Votre message</label>
          <textarea
            id="salon-texte"
            className="input"
            rows={2}
            value={texte}
            maxLength={initial.limits.length}
            placeholder="Dites quelque chose…"
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              // Entree envoie, Maj+Entree passe a la ligne : la convention de
              // tous les salons, et celle que les doigts connaissent deja.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(e as unknown as React.FormEvent); }
            }}
          />
          <div className="salon-envoi">
            <span className={`meta${restant < 60 ? ' changed' : ''}`}>{restant} CARACTERES</span>
            <span className="grow" />
            <button className="btn sm primary" type="submit" disabled={busy || !texte.trim()} aria-busy={busy}>
              <Icon name="salon" />ENVOYER
            </button>
          </div>
        </form>
      ) : (
        <div className="salon-ferme">
          <span className="meta">LECTURE OUVERTE · ECRITURE SUR COMPTE</span>
          <p>Le salon se lit sans compte. Pour y parler, connectez-vous.</p>
          <Link className="btn sm primary" href="/connexion"><Icon name="utilisateur" />SE CONNECTER</Link>
        </div>
      )}
    </section>
  );
}

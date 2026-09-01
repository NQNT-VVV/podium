'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import type { Me } from '@/lib/types';
import { AVATARS } from './avatars';

export function AuthForm({ discord, initialError }: { discord: boolean; initialError?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * 8)]);
  const [error, setError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const path = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const { user } = await api<{ user: Me }>('POST', path, { pseudo, password, avatar });
      toast(tab === 'login' ? `Content de te revoir, ${user.pseudo} !` : `Bienvenue, ${user.pseudo} !`, 'ok');
      router.push(tab === 'login' ? '/' : `/joueurs/${encodeURIComponent(user.pseudo)}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card pad form" onSubmit={submit}>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => setTab('login')}>Connexion</button>
        <button type="button" role="tab" aria-selected={tab === 'register'} onClick={() => setTab('register')}>Creer un compte</button>
      </div>

      {discord && (
        <>
          <a className="btn discord block" href="/api/auth/discord">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18 18 0 0 1 4.4 2.2 16 16 0 0 0-15.2 0A18 18 0 0 1 8.8 3.4L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9.1-.2 13.6.2 18.1a20 20 0 0 0 6 3l1.3-2.1a13 13 0 0 1-2-1l.5-.4a14.3 14.3 0 0 0 12 0l.5.4a13 13 0 0 1-2 1l1.3 2.1a20 20 0 0 0 6-3c.5-5.2-.8-9.7-3.5-13.7ZM8.5 15.4c-1.2 0-2.1-1.1-2.1-2.4s1-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s1-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" /></svg>
            Continuer avec Discord
          </a>
          <div className="divider">ou avec un pseudo</div>
        </>
      )}

      <label className="field">
        <span>Pseudo</span>
        <input className="input" value={pseudo} onChange={(e) => setPseudo(e.target.value)} autoComplete="username" required maxLength={20} placeholder="Le meme que dans les jeux, idealement" />
      </label>
      <label className="field">
        <span>Mot de passe</span>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required minLength={6} />
      </label>

      {tab === 'register' && (
        <div className="field">
          <span>Avatar</span>
          <div className="emoji-grid">
            {AVATARS.map((e) => (
              <button type="button" key={e} aria-pressed={avatar === e} onClick={() => setAvatar(e)} aria-label={e}>{e}</button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error" role="alert">{error}</div>}

      <div className="actions">
        <button className="btn primary lg" type="submit" disabled={busy}>{tab === 'login' ? 'Se connecter' : 'Creer mon compte'}</button>
        <span className="hint">
          {tab === 'login' ? 'Pas encore de compte ? Bascule sur « Creer un compte ».' : 'Aucune adresse e-mail demandee. Le pseudo est ta seule identite.'}
        </span>
      </div>
    </form>
  );
}

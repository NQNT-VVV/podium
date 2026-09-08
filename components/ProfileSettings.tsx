'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import type { Me } from '@/lib/types';
import { AVATARS } from './avatars';

export function ProfileSettings({ user, discord, password, linked }: { user: Me; discord: boolean; password: boolean; linked: boolean }) {
  const router = useRouter();
  const [pseudo, setPseudo] = useState(user.pseudo);
  const [avatar, setAvatar] = useState(user.avatar);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('PATCH', '/api/auth/me', { pseudo, avatar });
      toast('Profil enregistre. Les jeux le verront a ta prochaine partie.', 'ok');
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('POST', '/api/auth/password', { current, next });
      toast('Mot de passe change.', 'ok');
      setCurrent(''); setNext('');
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm('Supprimer definitivement ton compte ? Cotes, badges et sessions disparaissent, tes parties deviennent anonymes.')) return;
    setBusy(true);
    try {
      await api('DELETE', '/api/auth/me', { confirm });
      toast('Compte supprime. Merci d’avoir joue.', 'ok');
      router.push('/');
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <form className="card pad form" onSubmit={saveProfile}>
        <h2 style={{ fontSize: 20 }}>Identite</h2>
        <label className="field">
          <span>Pseudo</span>
          <input className="input" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required maxLength={20} />
          <span className="hint">C’est lui que les jeux pre-remplissent quand tu rejoins une partie.</span>
        </label>
        <div className="field">
          <span>Avatar</span>
          <div className="emoji-grid">
            {AVATARS.map((e) => (
              <button type="button" key={e} aria-pressed={avatar === e} onClick={() => setAvatar(e)} aria-label={e}>{e}</button>
            ))}
          </div>
        </div>
        <div className="actions"><button className="btn primary" type="submit" disabled={busy}>Enregistrer</button></div>
      </form>

      <div className="col" style={{ gap: 20 }}>
        {password && (
        <form className="card pad form" onSubmit={savePassword}>
          <h2 style={{ fontSize: 20 }}>{user.hasPassword ? 'Mot de passe' : 'Definir un mot de passe'}</h2>
          {user.hasPassword && (
            <label className="field">
              <span>Actuel</span>
              <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
          <label className="field">
            <span>Nouveau</span>
            <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={6} />
          </label>
          <div className="actions"><button className="btn" type="submit" disabled={busy}>Changer</button></div>
        </form>
        )}

        {discord && (
          <div className="card pad form">
            <h2 style={{ fontSize: 20 }}>Discord</h2>
            {linked
              ? <p className="muted" style={{ fontSize: 14 }}>Compte Discord rattache : <b>{user.discordName}</b>. Tu peux te connecter en un clic.</p>
              : <p className="muted" style={{ fontSize: 14 }}>{password ? 'Rattache ton Discord pour te connecter sans mot de passe.' : 'Rattache ton Discord pour garder ce compte : c’est desormais la seule facon de se connecter.'}</p>}
            {!linked && <div className="actions"><a className="btn discord" href="/api/auth/discord">Rattacher Discord</a></div>}
          </div>
        )}

        <div className="card pad form">
          <h2 style={{ fontSize: 20 }}>Mes donnees</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            Tout ce que Podium sait de toi, en un fichier JSON : compte, cotes, badges, parties.
          </p>
          <div className="actions"><a className="btn" href="/api/auth/export">Telecharger mes donnees</a></div>
        </div>

        <form className="card pad form danger-zone" onSubmit={deleteAccount}>
          <h2 style={{ fontSize: 20 }}>Partir</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            Suppression immediate et definitive : compte, sessions, cotes et badges. Tes parties restent dans
            l’historique des autres, sous « Joueur parti ». Retape ton pseudo pour confirmer.
          </p>
          <label className="field">
            <span>Ton pseudo</span>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.pseudo} autoComplete="off" required />
          </label>
          <div className="actions"><button className="btn danger" type="submit" disabled={busy || !confirm}>Supprimer mon compte</button></div>
        </form>
      </div>
    </div>
  );
}

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
      toast('PROFIL ENREGISTRE · LES JEUX LE VERRONT A LA PROCHAINE PARTIE', 'ok');
      router.refresh();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('POST', '/api/auth/password', { current, next });
      toast('MOT DE PASSE CHANGE', 'ok');
      setCurrent(''); setNext('');
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm('SUPPRIMER DEFINITIVEMENT TON COMPTE ? COTES, BADGES ET SESSIONS DISPARAISSENT, TES PARTIES DEVIENNENT ANONYMES.')) return;
    setBusy(true);
    try {
      await api('DELETE', '/api/auth/me', { confirm });
      toast('COMPTE SUPPRIME · FICHE EFFACEE', 'ok');
      router.push('/');
      router.refresh();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <form className="card pad form" onSubmit={saveProfile}>
        <h2>IDENTITE</h2>
        <label className="field">
          <span>PSEUDO</span>
          <input className="input" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required maxLength={20} />
          <span className="hint">C’est lui que les jeux pre-remplissent quand tu rejoins une partie.</span>
        </label>
        <div className="field">
          <span>AVATAR</span>
          <div className="emoji-grid">
            {AVATARS.map((e) => (
              <button type="button" key={e} aria-pressed={avatar === e} onClick={() => setAvatar(e)} aria-label={e}>{e}</button>
            ))}
          </div>
        </div>
        <div className="actions"><button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? <>ENREGISTREMENT<span className="loading-dots" aria-hidden="true"><span /><span /><span /></span></> : 'ENREGISTRER'}</button></div>
      </form>

      <div className="col" style={{ gap: 20 }}>
        {password && (
        <form className="card pad form" onSubmit={savePassword}>
          <h2>{user.hasPassword ? 'MOT DE PASSE' : 'DEFINIR UN MOT DE PASSE'}</h2>
          {user.hasPassword && (
            <label className="field">
              <span>ACTUEL</span>
              <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
          <label className="field">
            <span>NOUVEAU</span>
            <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={6} />
          </label>
          <div className="actions"><button className="btn" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'CHANGEMENT…' : 'CHANGER'}</button></div>
        </form>
        )}

        {discord && (
          <div className="card pad form">
            <h2>DISCORD</h2>
            {linked
              ? <p className="meta" style={{ textTransform: 'none' }}>Compte Discord rattache : <b>{user.discordName}</b></p>
              : <p className="meta" style={{ textTransform: 'none' }}>{password ? 'Rattache ton Discord pour te connecter sans mot de passe.' : 'Rattache ton Discord pour garder ce compte : c’est desormais la seule facon de se connecter.'}</p>}
            {!linked && <div className="actions"><a className="btn discord" href="/api/auth/discord">RATTACHER DISCORD</a></div>}
          </div>
        )}

        <div className="card pad form">
          <h2>MES DONNEES</h2>
          <p className="meta" style={{ textTransform: 'none' }}>Tout ce que le systeme sait de toi, en un fichier JSON : compte, cotes, badges, parties.</p>
          <div className="actions"><a className="btn" href="/api/auth/export">TELECHARGER MES DONNEES</a></div>
        </div>

        <form className="card pad form danger-zone" onSubmit={deleteAccount}>
          <h2>PARTIR</h2>
          <p className="meta" style={{ textTransform: 'none' }}>
            Suppression immediate et definitive : compte, sessions, cotes et badges. Tes parties restent dans
            l’historique des autres, sous « Joueur parti ». Retape ton pseudo pour confirmer.
          </p>
          <label className="field">
            <span>TON PSEUDO</span>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.pseudo} autoComplete="off" required />
          </label>
          <div className="actions"><button className="btn danger" type="submit" disabled={busy || !confirm} aria-busy={busy}>{busy ? 'SUPPRESSION…' : 'SUPPRIMER MON COMPTE'}</button></div>
        </form>
      </div>
    </div>
  );
}

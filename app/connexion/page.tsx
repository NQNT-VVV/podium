import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/AuthForm';
import { apiGet } from '@/lib/api';
import type { AuthMe } from '@/lib/types';

export const metadata: Metadata = { title: 'Connexion' };

type Props = { searchParams: Promise<{ erreur?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const [me, sp] = await Promise.all([apiGet<AuthMe>('/api/auth/me'), searchParams]);
  if (me.user) redirect('/');
  return (
    <main className="shell narrow">
      <header className="page-head">
        <div>
          <div className="kicker"><span>PROCEDURE 0x01</span><span>OUVERTURE DE SESSION</span></div>
          <h1>IDENTIFICATION</h1>
          <p>UN COMPTE TE SUIT DANS TOUS LES JEUX : TON PSEUDO EST RECONNU, TES PARTIES SONT CONSIGNEES, TES OFFICES SE CUMULENT.</p>
        </div>
      </header>
      <AuthForm discord={me.providers.discord} passwordLogin={me.providers.password} initialError={sp.erreur} />
      <p className="meta">
        {me.providers.password
          ? 'LE SYSTEME NE GARDE QU’UN PSEUDO, UN AVATAR ET UN MOT DE PASSE HACHE. RIEN D’AUTRE.'
          : 'LE SYSTEME NE GARDE QUE L’IDENTIFIANT DISCORD, LE PSEUDO ET L’AVATAR. AUCUN ACCES AUX MESSAGES NI AUX SERVEURS.'}
      </p>
    </main>
  );
}

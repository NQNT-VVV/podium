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
          <p>Un compte te suit dans tous les jeux : ton pseudo est reconnu, tes parties sont consignees, tes defis se cumulent.</p>
        </div>
      </header>
      <AuthForm discord={me.providers.discord} passwordLogin={me.providers.password} initialError={sp.erreur} />
      <p className="meta">
        {me.providers.password
          ? 'Le systeme ne garde qu’un pseudo, un avatar et un mot de passe hache. Rien d’autre.'
          : 'Le systeme ne garde que l’identifiant Discord, le pseudo et l’avatar. Aucun acces aux messages ni aux serveurs.'}
      </p>
    </main>
  );
}

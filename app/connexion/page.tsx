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
          <h1>Bienvenue</h1>
          <p>Un compte Podium te suit dans tous les jeux : ton pseudo est reconnu, tes parties comptent, tes defis se cumulent.</p>
        </div>
      </header>
      <AuthForm discord={me.providers.discord} passwordLogin={me.providers.password} initialError={sp.erreur} />
      <p className="faint" style={{ fontSize: 12.5, textAlign: 'center' }}>
        {me.providers.password
          ? 'Podium ne stocke qu’un pseudo, un avatar et un mot de passe hache. Rien d’autre.'
          : 'Podium ne garde que ton identifiant Discord, ton pseudo et ton avatar. Aucun acces a tes messages ni a tes serveurs.'}
      </p>
    </main>
  );
}

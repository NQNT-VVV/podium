import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AvisForm } from '@/components/AvisForm';
import { Icon } from '@/components/Icon';
import { apiGet } from '@/lib/api';
import type { AvisData, AuthMe } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Votre avis',
  description: 'Noter Podium, signaler un probleme, proposer une idee.',
};

export default async function AvisPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await apiGet<AuthMe>('/api/auth/me');
  if (!me.user) redirect('/connexion');

  const data = await apiGet<AvisData>('/api/avis');
  const { page } = await searchParams;

  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x09</span><span>AVIS · SIGNALEMENTS · IDEES</span></div>
          <h1>VOTRE AVIS</h1>
          <p>
            Podium n’a rien a vendre : votre retour ne sert qu’a le rendre meilleur. Une note, un
            probleme, une idee — tout arrive au meme endroit, et vous voyez ici ce qu’il devient.
          </p>
        </div>
        <div className="actions">
          <Link className="btn sm" href="/salon"><Icon name="salon" />SALON</Link>
        </div>
      </header>
      <AvisForm initial={data} page={page} />
      <p className="legal-updated">
        Ce que vous ecrivez ici part avec votre compte si vous le supprimez. Seule la note reste,
        detachee de vous, parce que c’est elle qui fait la moyenne. <Link href="/confidentialite">Politique de confidentialite</Link>.
      </p>
    </main>
  );
}

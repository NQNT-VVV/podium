import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Icon } from '@/components/Icon';
import { Reporting } from '@/components/Reporting';
import { apiGet } from '@/lib/api';
import type { AuthMe, Reporting as Data } from '@/lib/types';

export const metadata: Metadata = { title: 'Reporting' };

export default async function ReportingPage() {
  const me = await apiGet<AuthMe>('/api/auth/me');
  if (!me.user) redirect('/connexion');
  if (me.user.role !== 'admin') redirect('/');

  const data = await apiGet<Data>('/api/admin/reporting?days=30');

  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x0A</span><span>REPORTING · ACCES RESTREINT</span></div>
          <h1>REPORTING</h1>
          <p>
            Ce que disent les avis : la note moyenne et sa repartition, le volume jour par jour, les
            pages qui reviennent. Chaque retour se marque lu puis traite, et la reponse remonte a
            la personne sur sa page d’avis.
          </p>
        </div>
        <div className="actions">
          <Link className="btn sm" href="/admin"><Icon name="reglages" />ADMINISTRATION</Link>
        </div>
      </header>
      <Reporting initial={data} />
    </main>
  );
}

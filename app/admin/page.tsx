import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import Link from 'next/link';

import { AdminPanel } from '@/components/AdminPanel';
import { Icon } from '@/components/Icon';
import { apiGet } from '@/lib/api';
import type { AdminOverview, AuthMe } from '@/lib/types';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminPage() {
  const me = await apiGet<AuthMe>('/api/auth/me');
  if (!me.user) redirect('/connexion');
  if (me.user.role !== 'admin') redirect('/');
  const data = await apiGet<AdminOverview>('/api/admin/overview');
  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x00</span><span>SYSTEME · ACCES RESTREINT</span></div>
          <h1>ADMINISTRATION</h1>
          <p>Catalogue des jeux et leurs cles d’ingestion, defis, journal des resultats recus. Ajouter un jeu ici suffit pour qu’il apparaisse partout avec son classement et ses defis.</p>
        </div>
        <div className="actions">
          <Link className="btn sm" href="/admin/reporting"><Icon name="graphe" />REPORTING</Link>
        </div>
      </header>
      <AdminPanel data={data} />
    </main>
  );
}

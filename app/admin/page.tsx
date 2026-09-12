import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminPanel } from '@/components/AdminPanel';
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
          <p>CATALOGUE DES JEUX ET LEURS CLES D’INGESTION, OFFICES, JOURNAL DES RESULTATS RECUS. AJOUTER UN JEU ICI SUFFIT POUR QU’IL APPARAISSE PARTOUT AVEC SON CLASSEMENT ET SES OFFICES.</p>
        </div>
      </header>
      <AdminPanel data={data} />
    </main>
  );
}

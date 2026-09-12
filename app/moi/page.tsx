import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProfileSettings } from '@/components/ProfileSettings';
import { apiGet } from '@/lib/api';
import type { AuthMe } from '@/lib/types';

export const metadata: Metadata = { title: 'Reglages' };

type Props = { searchParams: Promise<{ discord?: string }> };

export default async function MePage({ searchParams }: Props) {
  const [me, sp] = await Promise.all([apiGet<AuthMe>('/api/auth/me'), searchParams]);
  if (!me.user) redirect('/connexion');
  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>PROCEDURE 0x02</span><span>FICHE DU SUJET</span></div>
          <h1>REGLAGES</h1>
          <p>Ton identite dans tous les jeux, et la maniere dont tu te connectes.</p>
        </div>
      </header>
      {sp.discord === 'ok' && <div className="pill ok" style={{ alignSelf: 'flex-start' }}>DISCORD RATTACHE</div>}
      <ProfileSettings user={me.user} discord={me.providers.discord} password={me.providers.password} linked={!!me.user.discordName} />
    </main>
  );
}

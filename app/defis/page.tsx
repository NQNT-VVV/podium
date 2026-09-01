import type { Metadata } from 'next';

import { ChallengeCard } from '@/components/ChallengeCard';
import { apiGet } from '@/lib/api';
import type { ChallengesData } from '@/lib/types';

export const metadata: Metadata = { title: 'Defis' };

export default async function ChallengesPage() {
  const data = await apiGet<ChallengesData>('/api/challenges');
  const daily = data.active.filter((c) => c.period === 'daily');
  const others = data.active.filter((c) => c.period !== 'daily');

  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <h1>Defis</h1>
          <p>
            Chaque semaine, un defi par jeu et un defi global, tires automatiquement. Chaque jour, les modes quotidiens
            comme la musique du jour. Les trois premiers gagnent un badge a la cloture.
          </p>
        </div>
      </header>

      {daily.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">Aujourd’hui</h2></div>
          <div className="grid-3">{daily.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <section className="block">
        <div className="block-head"><h2 className="section-title">Cette semaine</h2></div>
        {others.length ? <div className="grid-3">{others.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div> : <div className="empty">Aucun defi en cours.</div>}
      </section>

      {data.upcoming.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">A venir</h2></div>
          <div className="grid-3">{data.upcoming.map((c) => <ChallengeCard key={c.id} challenge={c} showBoard={false} />)}</div>
        </section>
      )}

      {data.past.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">Palmares</h2></div>
          <div className="grid-3">{data.past.map((c) => <ChallengeCard key={c.id} challenge={c} showBoard={!c.winners?.length} />)}</div>
        </section>
      )}
    </main>
  );
}

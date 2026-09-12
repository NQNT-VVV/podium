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
          <div className="kicker"><span>SECTION 0x03</span><span>OFFICES QUOTIDIENS ET HEBDOMADAIRES</span></div>
          <h1>DEFIS</h1>
          <p>
            CHAQUE SEMAINE, UN OFFICE PAR JEU ET UN OFFICE GLOBAL, TIRES AUTOMATIQUEMENT. CHAQUE JOUR, LES MODES
            QUOTIDIENS. LES TROIS PREMIERS RECOIVENT UN BADGE A LA CLOTURE.
          </p>
        </div>
      </header>

      {daily.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">AUJOURD’HUI</h2></div>
          <div className="grid-3">{daily.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <section className="block">
        <div className="block-head"><h2 className="section-title">CETTE SEMAINE</h2></div>
        {others.length ? <div className="grid-3">{others.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div> : <div className="empty"><span>AUCUN OFFICE EN COURS</span></div>}
      </section>

      {data.upcoming.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">A VENIR</h2></div>
          <div className="grid-3">{data.upcoming.map((c) => <ChallengeCard key={c.id} challenge={c} showBoard={false} />)}</div>
        </section>
      )}

      {data.past.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">PALMARES</h2></div>
          <div className="grid-3">{data.past.map((c) => <ChallengeCard key={c.id} challenge={c} showBoard={!c.winners?.length} />)}</div>
        </section>
      )}
    </main>
  );
}

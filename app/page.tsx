import Link from 'next/link';

import { ChallengeCard } from '@/components/ChallengeCard';
import { GameCard } from '@/components/GameCard';
import { MatchList } from '@/components/MatchList';
import { SeasonTable } from '@/components/SeasonTable';
import { apiGet } from '@/lib/api';
import type { AuthMe, HomeData } from '@/lib/types';

export default async function HomePage() {
  const [data, me] = await Promise.all([apiGet<HomeData>('/api/home'), apiGet<AuthMe>('/api/auth/me')]);
  const daily = data.challenges.filter((c) => c.period === 'daily');
  const weekly = data.challenges.filter((c) => c.period !== 'daily');

  return (
    <main className="shell">
      <header className="hero">
        <span className="pill"><span className="dot" /> {data.stats.users} joueur{data.stats.users > 1 ? 's' : ''} · {data.stats.matchesWeek} partie{data.stats.matchesWeek > 1 ? 's' : ''} cette semaine</span>
        <h1>Podium</h1>
        <p>Un compte, tous les jeux. Chaque partie compte pour ta cote, la saison en cours et les defis de la semaine.</p>
        {!me.user && (
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <Link className="btn primary lg" href="/connexion">Creer mon compte</Link>
            <Link className="btn lg" href="/classement">Voir le classement</Link>
          </div>
        )}
      </header>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Les jeux</h2></div>
        <div className="grid-2">
          {data.games.map((g) => <GameCard key={g.slug} game={g} />)}
          <article className="card game-card soon" style={{ ['--brand' as string]: '#6b6690', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 200 }}>
            <span className="icon" aria-hidden="true">✨</span>
            <h2 style={{ fontSize: 20 }}>Prochain jeu</h2>
            <p className="tagline">La plateforme est faite pour en accueillir d’autres. Chaque nouveau jeu arrive avec son classement et ses defis.</p>
          </article>
        </div>
      </section>

      {daily.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">Aujourd’hui</h2><Link className="more" href="/defis">Tous les defis →</Link></div>
          <div className="grid-3">{daily.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">Defis de la semaine</h2><Link className="more" href="/defis">Tous les defis →</Link></div>
          {weekly.length ? <div className="grid-3">{weekly.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div> : <div className="empty">Les defis de la semaine arrivent.</div>}
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">Saison · {data.season.label}</h2><Link className="more" href="/classement">Classement complet →</Link></div>
          <div className="card tight"><SeasonTable rows={data.season.rows} meId={me.user?.id} /></div>
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Dernieres parties</h2></div>
        <MatchList matches={data.matches} />
      </section>
    </main>
  );
}

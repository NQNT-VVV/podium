import Link from 'next/link';

import { ChallengeCard } from '@/components/ChallengeCard';
import { GameCard } from '@/components/GameCard';
import { MatchList } from '@/components/MatchList';
import { SeasonTable } from '@/components/SeasonTable';
import { apiGet } from '@/lib/api';
import { hex } from '@/lib/hex';
import type { AuthMe, HomeData } from '@/lib/types';

export default async function HomePage() {
  const [data, me] = await Promise.all([apiGet<HomeData>('/api/home'), apiGet<AuthMe>('/api/auth/me')]);
  const daily = data.challenges.filter((c) => c.period === 'daily');
  const weekly = data.challenges.filter((c) => c.period !== 'daily');

  return (
    <main className="shell">
      <header className="hero">
        <div className="meta-line">
          <span>HUB DE JEUX · V0.1</span>
          <span>SUJETS {hex(data.stats.users)}</span>
          <span>PARTIES CONSIGNEES {hex(data.stats.matches, 4)}</span>
          <span>OFFICES EN COURS {hex(data.stats.activeChallenges)}</span>
        </div>
        <h1>PODIUM</h1>
        <p>UN COMPTE, TOUS LES JEUX. CHAQUE PARTIE EST CONSIGNEE, COTEE, ET COMPTE POUR LA SAISON.</p>
        {!me.user && (
          <div className="cta">
            <Link className="btn primary lg" href="/connexion">{me.providers.password ? 'CREER MON COMPTE' : 'SE CONNECTER AVEC DISCORD'}</Link>
            <Link className="btn lg" href="/classement">VOIR LE CLASSEMENT</Link>
          </div>
        )}
      </header>

      <section className="block">
        <div className="block-head"><h2 className="section-title">0x01 · LES JEUX</h2></div>
        <div className="grid-2">
          {data.games.map((g) => <GameCard key={g.slug} game={g} />)}
          <article className="card game-card soon">
            <div className="head"><span>EMPLACEMENT LIBRE</span><span>0x00</span></div>
            <div>
              <h2>PROCHAIN JEU</h2>
              <p className="tagline">LA PLATEFORME EST FAITE POUR EN ACCUEILLIR D’AUTRES. CHAQUE JEU ARRIVE AVEC SON CLASSEMENT ET SES OFFICES.</p>
            </div>
            <div className="cta"><span className="meta">EN ATTENTE</span></div>
          </article>
        </div>
      </section>

      {daily.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">0x02 · AUJOURD’HUI</h2><Link className="more" href="/defis">TOUS LES DEFIS</Link></div>
          <div className="grid-3">{daily.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">0x03 · CETTE SEMAINE</h2><Link className="more" href="/defis">TOUS LES DEFIS</Link></div>
          {weekly.length ? <div className="grid-3">{weekly.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div> : <div className="empty"><span>LES OFFICES DE LA SEMAINE ARRIVENT</span></div>}
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">0x04 · SAISON {data.season.label.toUpperCase()}</h2><Link className="more" href="/classement">COMPLET</Link></div>
          <div className="card tight"><SeasonTable rows={data.season.rows} meId={me.user?.id} /></div>
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2 className="section-title">0x05 · JOURNAL DES PARTIES</h2></div>
        <MatchList matches={data.matches} />
      </section>
    </main>
  );
}

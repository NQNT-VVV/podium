import type { Metadata } from 'next';
import Link from 'next/link';

import { Ladder } from '@/components/Ladder';
import { SeasonTable } from '@/components/SeasonTable';
import { apiGet } from '@/lib/api';
import type { AuthMe, LeaderboardData } from '@/lib/types';

export const metadata: Metadata = { title: 'Classement' };

type Props = { searchParams: Promise<{ saison?: string; jeu?: string }> };

export default async function LeaderboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.saison) qs.set('season', sp.saison);
  if (sp.jeu) qs.set('game', sp.jeu);
  const [data, me] = await Promise.all([apiGet<LeaderboardData>(`/api/leaderboard?${qs}`), apiGet<AuthMe>('/api/auth/me')]);

  const link = (saison: string, jeu?: string) => {
    const p = new URLSearchParams();
    if (saison !== data.seasons[0]?.key) p.set('saison', saison);
    if (jeu) p.set('jeu', jeu);
    const s = p.toString();
    return `/classement${s ? `?${s}` : ''}`;
  };

  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x02</span><span>SAISON MENSUELLE · COTE PERMANENTE</span></div>
          <h1>CLASSEMENT</h1>
          <p>
            La saison dure un mois : chaque partie multijoueur rapporte de 10 a 110 points selon la place.
            La cote Elo, elle, ne se remet jamais a zero.
          </p>
        </div>
      </header>

      <section className="block">
        <div className="block-head">
          <h2 className="section-title">SAISON {data.season.label.toUpperCase()}{data.season.current ? '' : ' · CLOSE'}</h2>
        </div>
        <div className="row wrap">
          <div className="seg">
            <Link href={link(data.season.key)} aria-pressed={!data.game}>TOUS LES JEUX</Link>
            {data.games.map((g) => (
              <Link key={g.slug} href={link(data.season.key, g.slug)} aria-pressed={data.game?.slug === g.slug}>{g.name.toUpperCase()}</Link>
            ))}
          </div>
          <span className="grow" />
          {data.seasons.length > 1 && (
            <div className="seg">
              {data.seasons.map((s) => (
                <Link key={s.key} href={link(s.key, data.game?.slug)} aria-pressed={s.key === data.season.key}>{s.label.toUpperCase()}</Link>
              ))}
            </div>
          )}
        </div>
        <div className="card tight"><SeasonTable rows={data.rows} meId={me.user?.id} showGames={!data.game} /></div>
      </section>

      <section className="block">
        <div className="block-head"><h2 className="section-title">CLASSEMENT PERMANENT PAR JEU</h2></div>
        <div className="grid-2">
          {data.games.map((g) => (
            <div className="card" key={g.slug}>
              <div className="row" style={{ padding: 'var(--sp-3) var(--sp-3) 0' }}>
                <b style={{ font: 'var(--t-ui)', letterSpacing: 'var(--ls-mono)' }}>{g.name.toUpperCase()}</b>
                <span className="grow" />
                <Link className="meta" href={`/jeux/${g.slug}`}>VOIR LE JEU</Link>
              </div>
              <Ladder rows={g.ladder} meId={me.user?.id} compact />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

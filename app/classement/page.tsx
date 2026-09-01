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
          <h1>Classement</h1>
          <p>La saison dure un mois : chaque partie multijoueur rapporte de 10 a 110 points selon la place. La cote Elo, elle, ne se remet jamais a zero.</p>
        </div>
      </header>

      <section className="block">
        <div className="block-head">
          <h2 className="section-title">Saison · {data.season.label}{data.season.current ? '' : ' (terminee)'}</h2>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <div className="seg">
            <Link href={link(data.season.key)} className="btn xs ghost" aria-pressed={!data.game} style={{ borderRadius: 999 }}>Tous les jeux</Link>
            {data.games.map((g) => (
              <Link key={g.slug} href={link(data.season.key, g.slug)} className="btn xs ghost" aria-pressed={data.game?.slug === g.slug} style={{ borderRadius: 999 }}>{g.emoji} {g.name}</Link>
            ))}
          </div>
          <span className="grow" />
          {data.seasons.length > 1 && (
            <div className="seg">
              {data.seasons.map((s) => (
                <Link key={s.key} href={link(s.key, data.game?.slug)} className="btn xs ghost" aria-pressed={s.key === data.season.key} style={{ borderRadius: 999 }}>{s.label}</Link>
              ))}
            </div>
          )}
        </div>
        <div className="card tight"><SeasonTable rows={data.rows} meId={me.user?.id} showGames={!data.game} /></div>
      </section>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Ranked par jeu</h2></div>
        <div className="grid-2">
          {data.games.map((g) => (
            <div className="card" key={g.slug} style={{ overflow: 'hidden' }}>
              <div className="row" style={{ padding: '14px 16px 6px' }}>
                <span style={{ fontSize: 22 }} aria-hidden="true">{g.emoji}</span>
                <b style={{ fontFamily: 'var(--display)', fontSize: 17 }}>{g.name}</b>
                <span className="grow" />
                <Link className="more" href={`/jeux/${g.slug}`} style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Voir le jeu →</Link>
              </div>
              <div style={{ padding: '0 6px 6px' }}><Ladder rows={g.ladder} meId={me.user?.id} compact /></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

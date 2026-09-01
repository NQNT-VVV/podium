import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/Avatar';
import { MatchList } from '@/components/MatchList';
import { Sparkline } from '@/components/Sparkline';
import { TierChip } from '@/components/TierChip';
import { apiMaybe } from '@/lib/api';
import { fmtLong } from '@/lib/format';
import type { PlayerData } from '@/lib/types';

type Props = { params: Promise<{ pseudo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pseudo } = await params;
  return { title: decodeURIComponent(pseudo) };
}

export default async function PlayerPage({ params }: Props) {
  const { pseudo } = await params;
  const data = await apiMaybe<PlayerData>(`/api/players/${encodeURIComponent(decodeURIComponent(pseudo))}`);
  if (!data) notFound();
  const { user, ratings, season, badges, matches } = data;

  return (
    <main className="shell">
      <header className="profile-head">
        <Avatar emoji={user.avatar} size="lg" />
        <div className="grow">
          <h1>{user.pseudo}</h1>
          <p className="since">Sur Podium depuis le {fmtLong(user.createdAt)}{user.role === 'admin' ? ' · administrateur' : ''}</p>
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className="pill">Saison {season.label} : <b className="tnum">{season.points} pts</b>{season.pos ? ` · ${season.pos}e` : ''}</span>
            <span className="pill">{season.wins} victoire{season.wins > 1 ? 's' : ''} / {season.matches} partie{season.matches > 1 ? 's' : ''}</span>
          </div>
        </div>
        {data.me && <Link className="btn" href="/moi">⚙️ Reglages</Link>}
      </header>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Cotes</h2></div>
        {ratings.length ? (
          <div className="grid-3">
            {ratings.map((r) => (
              <div className="card rating-card" key={r.gameSlug}>
                <div className="head">
                  <span style={{ fontSize: 22 }} aria-hidden="true">{r.gameEmoji}</span>
                  <b><Link href={`/jeux/${r.gameSlug}`}>{r.gameName}</Link></b>
                  <span className="grow" />
                  {r.pos && <span className="pill">{r.pos}e</span>}
                </div>
                <div className="big">
                  <span className="rating">{r.rating}</span>
                  <TierChip tier={r.tier} />
                </div>
                <Sparkline points={r.history} id={r.gameSlug} />
                <div className="kpis">
                  <span><b>{r.wins}</b> victoires</span>
                  <span><b>{r.podiums}</b> podiums</span>
                  <span><b>{r.matches}</b> parties</span>
                  <span>record <b>{r.peak}</b></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">Aucune partie multijoueur classee pour l’instant.</div>
        )}
      </section>

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">Historique</h2></div>
          <MatchList matches={matches} mine />
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">Badges</h2></div>
          {badges.length ? (
            <div className="badges">
              {badges.map((b) => (
                <span className="badge" key={b.id} title={fmtLong(b.awardedAt)}>
                  <span className="e" aria-hidden="true">{b.emoji}</span>
                  <span>{b.challengeSlug ? <Link href={`/defis/${b.challengeSlug}`}>{b.label}</Link> : b.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="empty">Pas encore de badge. Un top 3 sur un defi en donne un.</div>
          )}
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/Avatar';
import { Engraving } from '@/components/Engraving';
import { MatchList } from '@/components/MatchList';
import { Sparkline } from '@/components/Sparkline';
import { TierChip } from '@/components/TierChip';
import { apiMaybe } from '@/lib/api';
import { fmtLongCaps } from '@/lib/format';
import { fmtInt, hex } from '@/lib/hex';
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
        <Engraving />
        <Avatar emoji={user.avatar} size="lg" />
        <div className="grow">
          <h1>{user.pseudo}</h1>
          <div className="since">
            <span>FICHE D’IDENTIFICATION · SUJET {user.id.slice(-4).toUpperCase()}{user.role === 'admin' ? ' · ADMINISTRATEUR' : ''}</span>
            <span>PREMIER CONTACT {fmtLongCaps(user.createdAt)}</span>
            <span>SAISON {season.label.toUpperCase()} · {fmtInt(season.points)} POINTS{season.pos ? ` · RANG ${hex(season.pos)}` : ''}</span>
            <span>{season.wins} VICTOIRES / {season.matches} PARTIES</span>
          </div>
        </div>
        {data.me && <Link className="btn" href="/moi">REGLAGES</Link>}
      </header>

      <section className="block">
        <div className="block-head"><h2 className="section-title">COTES</h2></div>
        {ratings.length ? (
          <div className="grid-3">
            {ratings.map((r) => (
              <div className="card rating-card" key={r.gameSlug}>
                <div className="head">
                  <b><Link href={`/jeux/${r.gameSlug}`}>{r.gameName.toUpperCase()}</Link></b>
                  <span className="grow" />
                  {r.pos && <span>RANG {hex(r.pos)}</span>}
                </div>
                <div className="big">
                  <span className="rating">{fmtInt(r.rating)}</span>
                  <TierChip tier={r.tier} />
                </div>
                <Sparkline points={r.history} />
                <div className="kpis">
                  <span>VICTOIRES <b>{r.wins}</b></span>
                  <span>PODIUMS <b>{r.podiums}</b></span>
                  <span>PARTIES <b>{r.matches}</b></span>
                  <span>RECORD <b>{fmtInt(r.peak)}</b></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty"><span>Aucune partie multijoueur classee.</span></div>
        )}
      </section>

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">HISTORIQUE</h2></div>
          <MatchList matches={matches} mine />
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">BADGES</h2></div>
          {badges.length ? (
            <div className="badges">
              {badges.map((b) => (
                <span className="badge" key={b.id} title={fmtLongCaps(b.awardedAt)}>
                  <span className={b.kind === 'gold' ? 'e gold' : 'e'}>{b.kind === 'gold' ? '0x01' : b.kind === 'silver' ? '0x02' : '0x03'}</span>
                  <span>{b.challengeSlug ? <Link href={`/defis/${b.challengeSlug}`}>{b.label.toUpperCase()}</Link> : b.label.toUpperCase()}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="empty"><span>Pas encore de badge. Un top 3 sur un defi en donne un.</span></div>
          )}
        </section>
      </div>
    </main>
  );
}

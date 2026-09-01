import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/Avatar';
import { Countdown } from '@/components/Countdown';
import { apiGet, apiMaybe } from '@/lib/api';
import { MEDALS, fmtAgo, fmtLong, metricValue } from '@/lib/format';
import type { AuthMe, Challenge } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await apiMaybe<{ challenge: Challenge }>(`/api/challenges/${encodeURIComponent(slug)}`);
  return { title: data ? data.challenge.title : 'Defi inconnu' };
}

const PERIOD = { daily: 'Defi du jour', weekly: 'Defi de la semaine', custom: 'Defi special' };

export default async function ChallengePage({ params }: Props) {
  const { slug } = await params;
  const [data, me] = await Promise.all([apiMaybe<{ challenge: Challenge }>(`/api/challenges/${encodeURIComponent(slug)}`), apiGet<AuthMe>('/api/auth/me')]);
  if (!data) notFound();
  const c = data.challenge;
  const playUrl = c.kind === 'mode' && c.game?.url ? `${c.game.url}/${c.mode}` : null;

  return (
    <main className="shell narrow">
      <header className="game-hero">
        <span className="icon" aria-hidden="true" style={{ ['--brand' as string]: c.game?.color || '#fbbf24' }}>{c.emoji}</span>
        <div className="grow">
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>{c.title}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
            <span className="pill">{PERIOD[c.period]} · {c.periodLabel}</span>
            {c.game ? <Link className="gamechip" href={`/jeux/${c.game.slug}`}>{c.game.emoji} {c.game.name}</Link> : <span className="gamechip">🎲 Tous les jeux</span>}
            {c.kind === 'auto' && <span className="pill">Critere : {c.metricLabel}</span>}
            {c.kind === 'mode' && <span className="pill">Mode du jeu : {c.mode}</span>}
          </div>
          {c.description && <p className="desc">{c.description}</p>}
          <p className="faint" style={{ fontSize: 13, marginTop: 8 }}>
            Du {fmtLong(c.startsAt)} au {fmtLong(c.endsAt)}
            {c.state === 'active' && <> · <Countdown endsAt={c.endsAt} /></>}
          </p>
        </div>
        {playUrl && c.state === 'active' && <a className="btn primary lg" href={playUrl} target="_blank" rel="noopener">Jouer ↗</a>}
      </header>

      {c.winners && c.winners.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">Vainqueurs</h2></div>
          <div className="badges">
            {c.winners.map((w) => (
              <Link key={w.userId} className="badge" href={`/joueurs/${encodeURIComponent(w.pseudo)}`}>
                <span className="e">{w.emoji}</span> <Avatar emoji={w.avatar} size="sm" /> {w.pseudo}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <div className="block-head"><h2 className="section-title">Classement du defi</h2></div>
        <div className="card tight">
          {c.board && c.board.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th className="pos">#</th><th>Joueur</th><th className="num">{c.metricLabel}</th><th className="num hide-sm">Parties</th><th className="num hide-sm">Derniere</th></tr>
                </thead>
                <tbody>
                  {c.board.map((r) => (
                    <tr key={r.userId} className={me.user?.id === r.userId ? 'me' : ''}>
                      <td className={`pos ${r.pos <= 3 ? 'top' : ''}`}>{r.pos <= 3 ? <span className="medal">{MEDALS[r.pos - 1]}</span> : r.pos}</td>
                      <td><span className="player"><Avatar emoji={r.avatar} size="sm" /><Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link></span></td>
                      <td className="num rating">{metricValue(c.metric, r.value)}</td>
                      <td className="num hide-sm muted">{r.matches}</td>
                      <td className="num hide-sm muted">{fmtAgo(r.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">{c.state === 'upcoming' ? 'Le defi n’a pas encore commence.' : 'Personne n’a encore marque. La premiere place est libre.'}</div>
          )}
        </div>
      </section>
    </main>
  );
}

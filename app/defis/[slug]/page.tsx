import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/Avatar';
import { Countdown } from '@/components/Countdown';
import { Rank } from '@/components/Rank';
import { apiGet, apiMaybe } from '@/lib/api';
import { fmtAgo, fmtLongCaps, metricValue } from '@/lib/format';
import { hex } from '@/lib/hex';
import type { AuthMe, Challenge } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await apiMaybe<{ challenge: Challenge }>(`/api/challenges/${encodeURIComponent(slug)}`);
  return { title: data ? data.challenge.title : 'Defi inconnu' };
}

const PERIOD: Record<string, string> = { daily: 'OFFICE DU JOUR', weekly: 'OFFICE DE LA SEMAINE', custom: 'OFFICE EXCEPTIONNEL' };

export default async function ChallengePage({ params }: Props) {
  const { slug } = await params;
  const [data, me] = await Promise.all([apiMaybe<{ challenge: Challenge }>(`/api/challenges/${encodeURIComponent(slug)}`), apiGet<AuthMe>('/api/auth/me')]);
  if (!data) notFound();
  const c = data.challenge;
  const playUrl = c.kind === 'mode' && c.game?.url ? `${c.game.url}/${c.mode}` : null;

  return (
    <main className="shell narrow">
      <header className="game-hero">
        <div className="grow">
          <div className="kicker" style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', font: 'var(--t-meta)', letterSpacing: 'var(--ls-mono)', color: 'var(--ink-60)', marginBottom: 'var(--sp-2)' }}>
            <span>{PERIOD[c.period]}</span>
            <span>{c.periodLabel.toUpperCase()}</span>
            <span>{c.kind === 'auto' ? `CRITERE · ${c.metricLabel.toUpperCase()}` : `MODE · ${(c.mode ?? '').toUpperCase()}`}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(40.5px, 7vw, 80px)' }}>{c.title}</h1>
          {c.description && <p className="desc">{c.description}</p>}
          <div className="row wrap" style={{ marginTop: 'var(--sp-3)' }}>
            {c.game ? <Link className="gamechip" href={`/jeux/${c.game.slug}`}>{c.game.name.toUpperCase()}</Link> : <span className="gamechip">TOUS LES JEUX</span>}
            <span className="meta">DU {fmtLongCaps(c.startsAt)} AU {fmtLongCaps(c.endsAt)}</span>
            {c.state === 'active' && <Countdown endsAt={c.endsAt} />}
          </div>
        </div>
        {playUrl && c.state === 'active' && <a className="btn primary lg" href={playUrl} target="_blank" rel="noopener">JOUER</a>}
      </header>

      {c.winners && c.winners.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">VAINQUEURS</h2></div>
          <div className="badges">
            {c.winners.map((w, i) => (
              <Link key={w.userId} className="badge" href={`/joueurs/${encodeURIComponent(w.pseudo)}`}>
                <span className={i === 0 ? 'e gold' : 'e'}>{hex(i + 1)}</span>
                <Avatar emoji={w.avatar} size="sm" /> {w.pseudo}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <div className="block-head"><h2 className="section-title">CLASSEMENT DE L’OFFICE</h2></div>
        <div className="card tight">
          {c.board && c.board.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th className="pos">RANG</th><th>SUJET</th><th className="num">{c.metricLabel.toUpperCase()}</th><th className="num hide-sm">PARTIES</th><th className="num hide-sm">DERNIERE</th></tr>
                </thead>
                <tbody>
                  {c.board.map((r) => (
                    <tr key={r.userId} className={me.user?.id === r.userId ? 'me' : ''}>
                      <td className={`pos ${r.pos <= 3 ? 'top' : ''}`}><Rank pos={r.pos} /></td>
                      <td>
                        <span className="player">
                          <Avatar emoji={r.avatar} size="sm" />
                          <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>
                          {me.user?.id === r.userId && <span className="you">VOUS</span>}
                        </span>
                      </td>
                      <td className="num rating">{metricValue(c.metric, r.value)}</td>
                      <td className="num hide-sm meta-cell">{r.matches}</td>
                      <td className="num hide-sm meta-cell">{fmtAgo(r.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><span>{c.state === 'upcoming' ? 'L’OFFICE N’A PAS COMMENCE' : 'PERSONNE N’A ENCORE MARQUE · LA PREMIERE PLACE EST LIBRE'}</span></div>
          )}
        </div>
      </section>
    </main>
  );
}

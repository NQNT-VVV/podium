import Link from 'next/link';

import type { Challenge } from '@/lib/types';
import { MEDALS, metricValue } from '@/lib/format';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';

const PERIOD = { daily: 'Defi du jour', weekly: 'Defi de la semaine', custom: 'Defi special' };

export function ChallengeCard({ challenge: c, showBoard = true }: { challenge: Challenge; showBoard?: boolean }) {
  const playUrl = c.kind === 'mode' && c.game?.url ? `${c.game.url}/${c.mode}` : null;
  return (
    <article className={`card challenge ${c.period} ${c.state}`}>
      <div className="top">
        <span className="emoji" aria-hidden="true">{c.emoji}</span>
        <div className="grow">
          <h3><Link href={`/defis/${c.slug}`}>{c.title}</Link></h3>
          <div className="sub">
            <span>{PERIOD[c.period]}</span>
            {c.game
              ? <Link className="gamechip" href={`/jeux/${c.game.slug}`}>{c.game.emoji} {c.game.name}</Link>
              : <span className="gamechip">🎲 Tous les jeux</span>}
            {c.kind === 'auto' && <span>· {c.metricLabel}</span>}
          </div>
        </div>
      </div>
      {c.description && <p className="desc">{c.description}</p>}
      {showBoard && c.board && c.board.length > 0 && (
        <div className="board">
          {c.board.slice(0, 3).map((r, i) => (
            <div className="row" key={r.userId}>
              <span aria-hidden="true">{MEDALS[i]}</span>
              <Avatar emoji={r.avatar} size="sm" />
              <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`} className="ellipsis">{r.pseudo}</Link>
              <b>{metricValue(c.metric, r.value)}</b>
            </div>
          ))}
        </div>
      )}
      {showBoard && c.board && c.board.length === 0 && c.state === 'active' && (
        <div className="board"><div className="row muted">Personne encore : la premiere place est libre.</div></div>
      )}
      {c.winners && c.winners.length > 0 && (
        <div className="board">
          {c.winners.map((w) => (
            <div className="row" key={w.userId}>
              <span aria-hidden="true">{w.emoji}</span>
              <Avatar emoji={w.avatar} size="sm" />
              <Link href={`/joueurs/${encodeURIComponent(w.pseudo)}`} className="ellipsis">{w.pseudo}</Link>
            </div>
          ))}
        </div>
      )}
      <div className="foot">
        {c.state === 'active' && <Countdown endsAt={c.endsAt} />}
        {c.state === 'upcoming' && <span>bientot · {c.periodLabel}</span>}
        {c.state === 'past' && <span>{c.periodLabel}</span>}
        {playUrl && c.state === 'active' && <a className="btn xs primary" href={playUrl} target="_blank" rel="noopener">Jouer ↗</a>}
      </div>
    </article>
  );
}

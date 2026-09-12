import Link from 'next/link';

import type { Challenge } from '@/lib/types';
import { metricValue } from '@/lib/format';
import { hex } from '@/lib/hex';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';

const PERIOD: Record<string, string> = { daily: 'OFFICE DU JOUR', weekly: 'OFFICE DE LA SEMAINE', custom: 'OFFICE EXCEPTIONNEL' };

export function ChallengeCard({ challenge: c, showBoard = true }: { challenge: Challenge; showBoard?: boolean }) {
  const playUrl = c.kind === 'mode' && c.game?.url ? `${c.game.url}/${c.mode}` : null;
  return (
    <article className={`challenge ${c.period} ${c.state}`}>
      <div className="top">
        <div className="kicker">
          <span>{PERIOD[c.period]}</span>
          <span>{c.periodLabel.toUpperCase()}</span>
        </div>
        <h3><Link href={`/defis/${c.slug}`}>{c.title}</Link></h3>
        <div className="sub">
          {c.game
            ? <Link className="gamechip" href={`/jeux/${c.game.slug}`}>{c.game.name}</Link>
            : <span className="gamechip">TOUS LES JEUX</span>}
          <span>{c.kind === 'auto' ? `CRITERE · ${c.metricLabel.toUpperCase()}` : `MODE · ${(c.mode ?? '').toUpperCase()}`}</span>
        </div>
      </div>
      {c.description && <p className="desc">{c.description}</p>}
      {showBoard && c.board && c.board.length > 0 && (
        <div className="board">
          {c.board.slice(0, 3).map((r) => (
            <div className="row" key={r.userId}>
              <span className={r.pos === 1 ? 'gold' : 'meta'}>{hex(r.pos)}</span>
              <Avatar emoji={r.avatar} size="sm" />
              <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`} className="ellipsis">{r.pseudo}</Link>
              <b>{metricValue(c.metric, r.value)}</b>
            </div>
          ))}
        </div>
      )}
      {showBoard && c.board && c.board.length === 0 && c.state === 'active' && (
        <div className="board"><div className="row empty-row">PERSONNE ENCORE · LA PREMIERE PLACE EST LIBRE</div></div>
      )}
      {c.winners && c.winners.length > 0 && (
        <div className="board">
          {c.winners.map((w, i) => (
            <div className="row" key={w.userId}>
              <span className={i === 0 ? 'gold' : 'meta'}>{hex(i + 1)}</span>
              <Avatar emoji={w.avatar} size="sm" />
              <Link href={`/joueurs/${encodeURIComponent(w.pseudo)}`} className="ellipsis">{w.pseudo}</Link>
              <b />
            </div>
          ))}
        </div>
      )}
      <div className="foot">
        {c.state === 'active' && <Countdown endsAt={c.endsAt} />}
        {c.state === 'upcoming' && <span>A VENIR</span>}
        {c.state === 'past' && <span>CLOS</span>}
        {playUrl && c.state === 'active' && <a className="btn primary xs" href={playUrl} target="_blank" rel="noopener">JOUER</a>}
      </div>
    </article>
  );
}

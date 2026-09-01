import Link from 'next/link';

import type { Match } from '@/lib/types';
import { MEDALS, fmtAgo, fmtScore, modeLabel } from '@/lib/format';
import { Delta } from './Delta';

function Name({ p }: { p: Match['players'][number] }) {
  if (p.pseudo) return <Link href={`/joueurs/${encodeURIComponent(p.pseudo)}`}>{p.pseudo}</Link>;
  return <span className="faint" title="Sans compte Podium">{p.nickname}</span>;
}

export function MatchList({ matches, withGame = true, mine = false }: { matches: Match[]; withGame?: boolean; mine?: boolean }) {
  if (!matches.length) return <div className="empty">Aucune partie remontee pour l’instant.</div>;
  return (
    <div className="matches">
      {matches.map((m) => {
        const top = m.players.slice(0, 3);
        return (
          <div className="match" key={m.id}>
            <span className="icon" aria-hidden="true">{m.gameEmoji}</span>
            <div className="info">
              <div className="title">
                {withGame && <Link href={`/jeux/${m.gameSlug}`}>{m.gameName}</Link>}
                <span className="pill">{modeLabel(m.mode)}</span>
                {m.challenge && <Link className="gamechip" href={`/defis/${m.challenge.slug}`}>🎯 {m.challenge.title}</Link>}
                {!m.rated && m.playersCount > 1 && <span className="faint" style={{ fontSize: 12 }}>non classee</span>}
              </div>
              <div className="podium">
                {m.playersCount === 1 ? (
                  <span><Name p={m.players[0]} /> · {fmtScore(m.players[0].score)} pts</span>
                ) : top.map((p, i) => (
                  <span key={p.position}>
                    <span aria-hidden="true">{MEDALS[i]}</span> <Name p={p} />
                    {mine && m.mine && p.rank === m.mine.rank && <Delta before={m.mine.ratingBefore} after={m.mine.ratingAfter} />}
                  </span>
                ))}
                {m.playersCount > 3 && <span className="faint">+{m.playersCount - 3}</span>}
              </div>
            </div>
            <div className="when">
              {mine && m.mine && <b>{m.playersCount > 1 ? `${m.mine.rank}e / ${m.playersCount}` : `${fmtScore(m.mine.score)} pts`}</b>}
              {fmtAgo(m.playedAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

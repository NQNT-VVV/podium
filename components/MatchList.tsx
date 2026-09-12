import Link from 'next/link';

import type { Match } from '@/lib/types';
import { fmtAgo, fmtScore, modeLabel } from '@/lib/format';
import { hex, hexOf } from '@/lib/hex';
import { Delta } from './Delta';

function Name({ p }: { p: Match['players'][number] }) {
  if (p.pseudo) return <Link href={`/joueurs/${encodeURIComponent(p.pseudo)}`}>{p.pseudo}</Link>;
  return <span className="faint" title="SANS COMPTE PODIUM">{p.nickname}</span>;
}

/**
 * `meId` designe la personne dont on regarde le profil.
 *
 * L'ecart de cote se posait sur qui partageait son rang : a egalite, il
 * s'affichait a cote de quelqu'un d'autre. On compare des identites, pas des
 * positions.
 */
export function MatchList({ matches, withGame = true, mine = false, meId = null }: { matches: Match[]; withGame?: boolean; mine?: boolean; meId?: string | null }) {
  if (!matches.length) return <div className="empty"><span>Aucune partie remontee pour l’instant.</span></div>;
  return (
    <div className="matches">
      {matches.map((m) => {
        const top = m.players.slice(0, 3);
        return (
          <div className="match" key={m.id}>
            <div className="info">
              <div className="title">
                {withGame && <Link href={`/jeux/${m.gameSlug}`}>{m.gameName.toUpperCase()}</Link>}
                <span>{modeLabel(m.mode)}</span>
                <span>{hex(m.playersCount)} SUJETS</span>
                {m.challenge && <Link className="gamechip" href={`/defis/${m.challenge.slug}`}>{m.challenge.title}</Link>}
                {!m.rated && m.playersCount > 1 && <span className="faint">NON CLASSEE</span>}
              </div>
              <div className="podium">
                {m.playersCount === 1 ? (
                  <span><Name p={m.players[0]} /> · {fmtScore(m.players[0].score)}</span>
                ) : top.map((p) => (
                  <span key={p.position}>
                    <span className={p.rank === 1 ? 'rk gold' : 'rk'}>{hex(p.rank)}</span> <Name p={p} />
                    {mine && m.mine && meId !== null && p.userId === meId && <Delta before={m.mine.ratingBefore} after={m.mine.ratingAfter} />}
                  </span>
                ))}
                {m.playersCount > 3 && <span className="faint">+{m.playersCount - 3}</span>}
              </div>
            </div>
            <div className="when">
              {mine && m.mine && <b>{m.playersCount > 1 ? hexOf(m.mine.rank, m.playersCount) : `${fmtScore(m.mine.score)} PTS`}</b>}
              {fmtAgo(m.playedAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import Link from 'next/link';

import type { SeasonRow } from '@/lib/types';
import { fmtInt } from '@/lib/hex';
import { Avatar } from './Avatar';
import { Rank } from './Rank';

export function SeasonTable({ rows, meId, showGames = true }: { rows: SeasonRow[]; meId?: string | null; showGames?: boolean }) {
  if (!rows.length) return <div className="empty"><span>Aucun point marque cette saison.</span></div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="pos">RANG</th>
            <th>SUJET</th>
            <th className="num">POINTS</th>
            <th className="num hide-sm">VICTOIRES</th>
            <th className="num hide-sm">PARTIES</th>
            {showGames && <th className="num hide-sm">JEUX</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={meId === r.userId ? 'me' : ''}>
              <td className={`pos ${r.pos <= 3 ? 'top' : ''}`}><Rank pos={r.pos} /></td>
              <td>
                <span className="player">
                  <Avatar emoji={r.avatar} size="sm" />
                  <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>
                  {meId === r.userId && <span className="you">VOUS</span>}
                </span>
              </td>
              <td className="num rating">{fmtInt(r.points)}</td>
              <td className="num hide-sm meta-cell">{r.wins}</td>
              <td className="num hide-sm meta-cell">{r.matches}</td>
              {showGames && <td className="num hide-sm meta-cell">{r.games}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

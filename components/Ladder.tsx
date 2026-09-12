import Link from 'next/link';

import type { LadderRow } from '@/lib/types';
import { fmtInt } from '@/lib/hex';
import { Avatar } from './Avatar';
import { Rank } from './Rank';
import { TierChip } from './TierChip';

export function Ladder({ rows, meId, compact = false }: { rows: LadderRow[]; meId?: string | null; compact?: boolean }) {
  if (!rows.length) {
    return <div className="empty"><span>Aucune partie classee. Les trois premieres servent au placement.</span></div>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="pos">RANG</th>
            <th>SUJET</th>
            <th>PALIER</th>
            <th className="num">COTE</th>
            {!compact && <th className="num hide-sm">V / PARTIES</th>}
            {!compact && <th className="num hide-sm">RECORD</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={meId === r.userId ? 'me' : ''}>
              <td className={`pos ${r.pos !== null && r.pos <= 3 ? 'top' : ''}`}><Rank pos={r.pos} /></td>
              <td>
                <span className="player">
                  <Avatar emoji={r.avatar} size="sm" />
                  <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>
                  {meId === r.userId && <span className="you">VOUS</span>}
                </span>
              </td>
              <td><TierChip tier={r.tier} /></td>
              <td className="num rating">{fmtInt(r.rating)}</td>
              {!compact && <td className="num hide-sm meta-cell">{r.wins} / {r.matches}</td>}
              {!compact && <td className="num hide-sm meta-cell">{fmtInt(r.peak)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

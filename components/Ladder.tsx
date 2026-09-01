import Link from 'next/link';

import type { LadderRow } from '@/lib/types';
import { MEDALS } from '@/lib/format';
import { Avatar } from './Avatar';
import { TierChip } from './TierChip';

export function Ladder({ rows, meId, compact = false }: { rows: LadderRow[]; meId?: string | null; compact?: boolean }) {
  if (!rows.length) return <div className="empty">Aucune partie classee pour l’instant. Les trois premieres parties servent au placement.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="pos">#</th>
            <th>Joueur</th>
            <th>Palier</th>
            <th className="num">Cote</th>
            {!compact && <th className="num hide-sm">V / P</th>}
            {!compact && <th className="num hide-sm">Record</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={meId === r.userId ? 'me' : ''}>
              <td className={`pos ${r.pos !== null && r.pos <= 3 ? 'top' : ''}`}>
                {r.pos === null ? '—' : r.pos <= 3 ? <span className="medal">{MEDALS[r.pos - 1]}</span> : r.pos}
              </td>
              <td>
                <span className="player">
                  <Avatar emoji={r.avatar} size="sm" />
                  <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`} className="ellipsis">{r.pseudo}</Link>
                </span>
              </td>
              <td><TierChip tier={r.tier} /></td>
              <td className="num rating">{r.rating}</td>
              {!compact && <td className="num hide-sm muted">{r.wins} / {r.matches}</td>}
              {!compact && <td className="num hide-sm muted">{r.peak}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

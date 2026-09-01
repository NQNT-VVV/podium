import Link from 'next/link';

import type { SeasonRow } from '@/lib/types';
import { MEDALS } from '@/lib/format';
import { Avatar } from './Avatar';

export function SeasonTable({ rows, meId, showGames = true }: { rows: SeasonRow[]; meId?: string | null; showGames?: boolean }) {
  if (!rows.length) return <div className="empty">Personne n’a encore marque de points cette saison.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="pos">#</th>
            <th>Joueur</th>
            <th className="num">Points</th>
            <th className="num hide-sm">Victoires</th>
            <th className="num hide-sm">Parties</th>
            {showGames && <th className="num hide-sm">Jeux</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={meId === r.userId ? 'me' : ''}>
              <td className={`pos ${r.pos <= 3 ? 'top' : ''}`}>{r.pos <= 3 ? <span className="medal">{MEDALS[r.pos - 1]}</span> : r.pos}</td>
              <td>
                <span className="player">
                  <Avatar emoji={r.avatar} size="sm" />
                  <Link href={`/joueurs/${encodeURIComponent(r.pseudo)}`} className="ellipsis">{r.pseudo}</Link>
                </span>
              </td>
              <td className="num rating">{r.points}</td>
              <td className="num hide-sm muted">{r.wins}</td>
              <td className="num hide-sm muted">{r.matches}</td>
              {showGames && <td className="num hide-sm muted">{r.games}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

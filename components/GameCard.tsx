import Link from 'next/link';

import type { Game } from '@/lib/types';
import { hex } from '@/lib/hex';

export function GameCard({ game }: { game: Game }) {
  const soon = game.status === 'soon';
  return (
    <article className={`card game-card ${soon ? 'soon' : ''}`}>
      <div className="head">
        <span>{soon ? 'BIENTOT' : 'EN LIGNE'}</span>
        <span>{game.stats && game.stats.matches > 0 ? `${hex(game.stats.matches)} PARTIES` : 'AUCUNE PARTIE'}</span>
      </div>
      <div>
        <h2>{game.name}</h2>
        <p className="tagline">{game.tagline}</p>
      </div>
      {game.modes.length > 0 && (
        <div className="meta">
          {game.modes.map((m) => <span className="pill" key={m.id}>{m.label.toUpperCase()}</span>)}
        </div>
      )}
      <div className="cta">
        <Link href={`/jeux/${game.slug}`}>CLASSEMENT ET DEFIS</Link>
        {game.url && !soon && <a className="btn xs primary" href={game.url} target="_blank" rel="noopener">JOUER</a>}
      </div>
    </article>
  );
}

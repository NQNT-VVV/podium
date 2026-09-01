import Link from 'next/link';

import type { Game } from '@/lib/types';

export function GameCard({ game }: { game: Game }) {
  const soon = game.status === 'soon';
  return (
    <article className={`card game-card ${soon ? 'soon' : ''}`} style={{ ['--brand' as string]: game.color }}>
      <div className="head">
        <span className="icon" aria-hidden="true">{game.emoji}</span>
        <div className="grow">
          <h2>{game.name}</h2>
          <div className="meta">
            {soon ? <span className="pill">Bientot</span> : <span className="pill ok"><span className="dot" /> En ligne</span>}
            {game.stats && game.stats.matches > 0 && <span className="pill">{game.stats.matches} partie{game.stats.matches > 1 ? 's' : ''}</span>}
            {game.modes.length > 0 && <span className="pill">{game.modes.map((m) => `${m.emoji} ${m.label}`).join(' · ')}</span>}
          </div>
        </div>
      </div>
      <p className="tagline">{game.tagline}</p>
      <div className="cta">
        {game.url && !soon && <a className="btn primary" href={game.url} target="_blank" rel="noopener">Jouer ↗</a>}
        <Link className="btn" href={`/jeux/${game.slug}`}>Classement et defis</Link>
      </div>
    </article>
  );
}

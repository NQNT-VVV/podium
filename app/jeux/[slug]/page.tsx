import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChallengeCard } from '@/components/ChallengeCard';
import { Ladder } from '@/components/Ladder';
import { MatchList } from '@/components/MatchList';
import { SeasonTable } from '@/components/SeasonTable';
import { apiGet, apiMaybe } from '@/lib/api';
import type { AuthMe, GameData } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await apiMaybe<GameData>(`/api/games/${encodeURIComponent(slug)}`);
  return { title: data ? data.game.name : 'Jeu inconnu' };
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const [data, me] = await Promise.all([apiMaybe<GameData>(`/api/games/${encodeURIComponent(slug)}`), apiGet<AuthMe>('/api/auth/me')]);
  if (!data) notFound();
  const { game } = data;

  return (
    <main className="shell" style={{ ['--brand' as string]: game.color }}>
      <header className="game-hero">
        <span className="icon" aria-hidden="true">{game.emoji}</span>
        <div className="grow">
          <h1>{game.name}</h1>
          <p className="desc">{game.description || game.tagline}</p>
          <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
            {game.status === 'soon' ? <span className="pill">Bientot</span> : <span className="pill ok"><span className="dot" /> En ligne</span>}
            {game.stats && <span className="pill">{game.stats.matches} partie{game.stats.matches > 1 ? 's' : ''} · {game.stats.players} joueur{game.stats.players > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {game.url && game.status !== 'soon' && <a className="btn primary lg" href={game.url} target="_blank" rel="noopener">Jouer ↗</a>}
          {game.modes.map((m) => game.url && (
            <a key={m.id} className="btn" href={`${game.url}/${m.id}`} target="_blank" rel="noopener">{m.emoji} {m.label} ↗</a>
          ))}
        </div>
      </header>

      {data.challenges.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">Defis en cours</h2><Link className="more" href="/defis">Tous les defis →</Link></div>
          <div className="grid-3">{data.challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">Ranked</h2></div>
          <div className="card tight"><Ladder rows={data.ladder} meId={me.user?.id} /></div>
          <p className="faint" style={{ fontSize: 12.5 }}>
            Cote Elo mise a jour a chaque partie multijoueur. Trois parties de placement, puis Bronze → Legende.
            Les joueurs sans compte Podium apparaissent dans les parties mais ne sont pas classes.
          </p>
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">Saison · {data.season.label}</h2></div>
          <div className="card tight"><SeasonTable rows={data.season.rows} meId={me.user?.id} showGames={false} /></div>
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2 className="section-title">Dernieres parties</h2></div>
        <MatchList matches={data.matches} withGame={false} />
      </section>
    </main>
  );
}

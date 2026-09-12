import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChallengeCard } from '@/components/ChallengeCard';
import { Ladder } from '@/components/Ladder';
import { MatchList } from '@/components/MatchList';
import { SeasonTable } from '@/components/SeasonTable';
import { apiGet, apiMaybe } from '@/lib/api';
import { hex } from '@/lib/hex';
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
    <main className="shell">
      <header className="game-hero">
        <div className="grow">
          <div className="meta-line" style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap', font: 'var(--t-meta)', letterSpacing: 'var(--ls-mono)', color: 'var(--ink-60)', marginBottom: 'var(--sp-2)' }}>
            <span>{game.status === 'soon' ? 'BIENTOT' : 'EN LIGNE'}</span>
            {game.stats && <span>PARTIES {hex(game.stats.matches, 4)}</span>}
            {game.stats && <span>SUJETS {hex(game.stats.players)}</span>}
          </div>
          <h1>{game.name}</h1>
          <p className="desc">{game.description || game.tagline}</p>
        </div>
        <div className="actions">
          {game.url && game.status !== 'soon' && <a className="btn primary lg" href={game.url} target="_blank" rel="noopener">JOUER</a>}
          {game.modes.map((m) => game.url && (
            <a key={m.id} className="btn" href={`${game.url}/${m.id}`} target="_blank" rel="noopener">{m.label.toUpperCase()}</a>
          ))}
        </div>
      </header>

      {data.challenges.length > 0 && (
        <section className="block">
          <div className="block-head"><h2 className="section-title">DEFIS EN COURS</h2><Link className="more" href="/defis">TOUS LES DEFIS</Link></div>
          <div className="grid-3">{data.challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}</div>
        </section>
      )}

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2 className="section-title">CLASSEMENT PERMANENT</h2></div>
          <div className="card tight"><Ladder rows={data.ladder} meId={me.user?.id} /></div>
          <p className="meta" style={{ maxWidth: '64ch' }}>
            Cote Elo mise a jour a chaque partie multijoueur. Trois parties de placement, puis Bronze jusqu’a Legende.
            Les joueurs sans compte apparaissent dans les parties mais ne sont pas classes.
          </p>
        </section>
        <section className="block">
          <div className="block-head"><h2 className="section-title">SAISON {data.season.label.toUpperCase()}</h2></div>
          <div className="card tight"><SeasonTable rows={data.season.rows} meId={me.user?.id} showGames={false} /></div>
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2 className="section-title">JOURNAL DES PARTIES</h2></div>
        <MatchList matches={data.matches} withGame={false} />
      </section>
    </main>
  );
}

/** Formes des reponses de l'API, partagees entre rendu serveur et composants client. */

export interface Tier { id: string; label: string; emoji: string; color: string; progress?: number }

export interface PublicUser { id: string; pseudo: string; avatar: string; role: 'player' | 'admin'; createdAt: number }
export interface Me extends PublicUser { hasPassword: boolean; discordName: string | null }

export interface GameMode { id: string; label: string; emoji: string; period: 'daily' | 'weekly' | 'none'; metric: string; description?: string }
export interface Game {
  slug: string; name: string; tagline: string; description: string; emoji: string; color: string; url: string;
  status: 'live' | 'soon' | 'off'; modes: GameMode[]; hasKey: boolean; sort: number; createdAt: number; updatedAt: number;
  stats?: { matches: number; players: number };
}

export interface LadderRow {
  pos: number | null; userId: string; pseudo: string; avatar: string; rating: number; matches: number; wins: number; podiums: number; peak: number; tier: Tier;
}
export interface SeasonRow { pos: number; userId: string; pseudo: string; avatar: string; points: number; matches: number; wins: number; games: number }

export interface BoardRow { pos: number; userId: string; pseudo: string; avatar: string; value: number; matches: number; lastAt: number }
export interface Winner { userId: string; pseudo: string; avatar: string; kind: string; emoji: string; label: string }
export interface Challenge {
  id: string; slug: string; gameSlug: string | null; title: string; description: string; emoji: string;
  kind: 'auto' | 'mode'; mode: string | null; metric: string; metricLabel: string; params: Record<string, unknown>;
  period: 'daily' | 'weekly' | 'custom'; periodLabel: string; startsAt: number; endsAt: number; closedAt: number | null;
  state: 'active' | 'upcoming' | 'past'; seed?: string;
  game: { slug: string; name: string; emoji: string; color: string; url: string } | null;
  board?: BoardRow[]; winners?: Winner[];
}

export interface MatchPlayer {
  position: number; userId: string | null; pseudo: string | null; nickname: string; avatar: string; score: number; rank: number;
  ratingBefore: number | null; ratingAfter: number | null; points: number;
}
export interface Match {
  id: string; gameSlug: string; gameName: string; gameEmoji: string; mode: string;
  challenge: { id: string; slug: string; title: string } | null;
  playedAt: number; durationS: number | null; playersCount: number; rated: boolean; meta: Record<string, unknown>; players: MatchPlayer[];
  mine?: { score: number; rank: number; ratingBefore: number | null; ratingAfter: number | null; points: number };
}

export interface HomeData {
  games: Game[];
  stats: { users: number; matches: number; matchesWeek: number; activeChallenges: number };
  challenges: Challenge[];
  season: { key: string; label: string; rows: SeasonRow[] };
  matches: Match[];
}

export interface GameData {
  game: Game; ladder: LadderRow[]; season: { key: string; label: string; rows: SeasonRow[] }; challenges: Challenge[]; matches: Match[];
}

export interface LeaderboardData {
  season: { key: string; label: string; start: number; end: number; current: boolean };
  seasons: { key: string; label: string }[];
  game: Game | null;
  rows: SeasonRow[];
  games: { slug: string; name: string; emoji: string; color: string; ladder: LadderRow[] }[];
}

export interface ChallengesData { active: Challenge[]; upcoming: Challenge[]; past: Challenge[] }

export interface PlayerRating {
  gameSlug: string; gameName: string; gameEmoji: string; rating: number; matches: number; wins: number; podiums: number; peak: number;
  tier: Tier; pos: number | null; history: { at: number; rating: number }[];
}
export interface Badge { id: number; kind: string; label: string; emoji: string; challengeId: string | null; challengeSlug: string | null; gameSlug: string | null; awardedAt: number }
export interface PlayerData {
  user: PublicUser; me: boolean; ratings: PlayerRating[];
  season: { key: string; label: string; points: number; matches: number; wins: number; pos: number | null };
  badges: Badge[]; matches: Match[];
}

export interface AuthMe { user: Me | null; providers: { password: boolean; discord: boolean } }

export interface AdminOverview {
  games: Game[]; logs: { id: number; game_slug: string | null; external_id: string | null; status: string; detail: string | null; at: number }[];
  users: number; challenges: { active: Challenge[]; upcoming: Challenge[] }; metrics: string[]; timeZone: string;
}

export interface Team {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  logo: string;
  record: string;
}

export type Sport = 'nba' | 'mlb' | 'nfl' | 'nhl';

export interface Game {
  id: string;
  sport: Sport;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'in_progress' | 'final';
  startTime: string;
}

export interface Pick {
  id: string;
  username: string;
  gameId: string;
  date: string;
  pickedTeamId: string;
  timestamp: number;
  result?: 'correct' | 'incorrect' | 'pending';
  pointsEarned?: number;
  sport?: Sport;
  confidence?: 1 | 2 | 3;
}

export interface User {
  username: string;
  createdAt: number;
  totalPoints: number;
  weeklyPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalPicks: number;
  correctPicks: number;
  badges: Badge[];
  followedLeagues: Sport[];
  followedTeams: string[]; // team IDs
  isBanned?: boolean;
  friends?: string[]; // accepted mutual connections
  friendRequestsSent?: string[]; // pending outgoing requests
  friendRequestsReceived?: string[]; // pending incoming requests
  pin?: string; // 4-digit recovery PIN
}

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  earnedAt: number;
}

export type BadgeId =
  | 'perfect_night'
  | 'upset_king'
  | 'hot_streak_5'
  | 'hot_streak_10'
  | 'iron_picker'
  | 'sharpshooter'
  | 'century_club'
  | 'first_blood';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  weeklyPoints: number;
  currentStreak: number;
  accuracy: number;
}

export interface PointsBreakdown {
  base: number;
  upsetBonus: number;
  streakBonus: number;
  total: number;
}

// Feed types

export type FeedPostType = 'trending_pick' | 'big_game' | 'player_performance' | 'news' | 'hot_picks' | 'game_result';

export interface FeedPost {
  id: string;
  type: FeedPostType;
  timestamp: number;
  sport: Sport;
  data: TrendingPickData | BigGameData | PlayerPerformanceData | NewsData | HotPicksData | GameResultData;
}

export interface HotPickEntry {
  username: string;
  pickedTeamId: string;
  pickedTeamName: string;
  pickedTeamAbbreviation: string;
  pickedTeamLogo: string;
  opponentAbbreviation: string;
  opponentLogo: string;
  sport: Sport;
  gameId: string;
}

export interface HotPicksData {
  date: string;
  picks: HotPickEntry[];
  headline: string;
}

export interface TrendingPickData {
  gameId: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamLogo: string;
  opponentName: string;
  opponentAbbreviation: string;
  opponentLogo: string;
  pickCount: number;
  totalPicksForGame: number;
  gameDate: string;
  startTime: string;
  sport: Sport;
}

export interface BigGameData {
  gameId: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  gameDate: string;
  sport: Sport;
  headline: string;
  homeScore: number | null;
  awayScore: number | null;
  status: Game['status'];
}

export interface PlayerPerformanceData {
  playerName: string;
  playerImageUrl: string;
  teamId: string;
  teamAbbreviation: string;
  teamLogo: string;
  sport: Sport;
  stats: Record<string, string | number>;
  headline: string;
  gameId: string;
  opponentAbbreviation: string;
  gameDate: string;
  isWin: boolean;
}

export interface NewsData {
  headline: string;
  description: string;
  imageUrl?: string;
  linkUrl: string;
  sport: Sport;
  published: string;
  teamAbbreviations?: string[]; // teams this article is about (empty = general league news)
}

export interface GameResultPickEntry {
  username: string;
  pickedTeamId: string;
  pickedTeamAbbreviation: string;
  pickedTeamLogo: string;
  correct: boolean;
}

export interface GameResultData {
  gameId: string;
  sport: Sport;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  gameDate: string;
  winnerAbbreviation: string;
  correctPickers: GameResultPickEntry[];
  totalPickers: number;
}

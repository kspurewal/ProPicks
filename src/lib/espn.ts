import { Game, Sport, Team } from './types';
import { toESPNDate } from './utils';
import { readGameCache, writeGameCache } from './storage';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const SPORT_CONFIGS: { sport: Sport; path: string }[] = [
  { sport: 'nba', path: 'basketball/nba' },
  { sport: 'mlb', path: 'baseball/mlb' },
  { sport: 'nfl', path: 'football/nfl' },
  { sport: 'nhl', path: 'hockey/nhl' },
];

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
  score?: string;
  records?: Array<{ summary: string }>;
}

interface ESPNEvent {
  id: string;
  date: string;
  competitions: Array<{
    competitors: ESPNCompetitor[];
    status: {
      type: {
        name: string;
        completed: boolean;
      };
    };
  }>;
}

function parseTeam(competitor: ESPNCompetitor): Team {
  return {
    id: competitor.team.id,
    name: competitor.team.name,
    displayName: competitor.team.displayName,
    abbreviation: competitor.team.abbreviation,
    logo: competitor.team.logo,
    record: competitor.records?.[0]?.summary || '0-0',
  };
}

function parseStatus(status: ESPNEvent['competitions'][0]['status']): Game['status'] {
  if (status.type.completed) return 'final';
  if (status.type.name === 'STATUS_IN_PROGRESS') return 'in_progress';
  return 'scheduled';
}

function parseGame(event: ESPNEvent, sport: Sport): Game {
  const comp = event.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === 'home')!;
  const away = comp.competitors.find((c) => c.homeAway === 'away')!;

  return {
    id: event.id,
    sport,
    date: event.date.split('T')[0],
    homeTeam: parseTeam(home),
    awayTeam: parseTeam(away),
    homeScore: home.score ? parseInt(home.score) : null,
    awayScore: away.score ? parseInt(away.score) : null,
    status: parseStatus(comp.status),
    startTime: event.date,
  };
}

async function fetchSportGames(sport: Sport, path: string, date: string): Promise<Game[]> {
  const cacheKey = `${sport}-${date}`;
  const cached = readGameCache(cacheKey);
  if (cached) {
    const { data, ageMinutes } = cached as { data: Game[]; ageMinutes: number };
    const allFinal = data.length > 0 && data.every((g: Game) => g.status === 'final');
    if (allFinal || ageMinutes < 5) {
      return data;
    }
  }

  const espnDate = toESPNDate(date);
  const url = `${ESPN_BASE}/${path}/scoreboard?dates=${espnDate}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (cached) return (cached as { data: Game[] }).data;
      return [];
    }

    const json = await res.json();
    const events: ESPNEvent[] = json.events || [];
    const games = events.map((e) => parseGame(e, sport));

    writeGameCache(cacheKey, games);
    return games;
  } catch {
    if (cached) return (cached as { data: Game[] }).data;
    return [];
  }
}

export async function fetchGames(date: string): Promise<Game[]> {
  const results = await Promise.all(
    SPORT_CONFIGS.map(({ sport, path }) => fetchSportGames(sport, path, date))
  );
  return results.flat();
}

export function getESPNPath(sport: Sport): string {
  return SPORT_CONFIGS.find((c) => c.sport === sport)!.path;
}

export { SPORT_CONFIGS };

// --- Fetch Teams for a sport ---

export interface ESPNTeamEntry {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos?: Array<{ href: string }>;
  };
}

export async function fetchTeams(sport: Sport): Promise<{ id: string; name: string; abbreviation: string; logo: string; sport: Sport }[]> {
  const cfg = SPORT_CONFIGS.find((c) => c.sport === sport);
  if (!cfg) return [];
  const url = `${ESPN_BASE}/${cfg.path}/teams`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const entries: ESPNTeamEntry[] = json.sports?.[0]?.leagues?.[0]?.teams || [];
    return entries.map((e) => ({
      id: e.team.id,
      name: e.team.displayName,
      abbreviation: e.team.abbreviation,
      logo: e.team.logos?.[0]?.href || '',
      sport,
    }));
  } catch {
    return [];
  }
}

// --- Game Summary (box scores) ---

interface ESPNAthleteStats {
  athlete: { displayName: string; id: string; headshot?: { href: string } };
  stats: string[];
}

const SPORT_HEADSHOT_PATHS: Record<Sport, string> = {
  nba: 'nba/players',
  mlb: 'mlb/players',
  nfl: 'nfl/players',
  nhl: 'nhl/players',
};

export function getPlayerHeadshotUrl(sport: Sport, athleteId: string): string {
  const path = SPORT_HEADSHOT_PATHS[sport];
  return `https://a.espncdn.com/i/headshots/${path}/full/${athleteId}.png`;
}

interface ESPNPlayerStats {
  team: { abbreviation: string; logo: string };
  statistics: Array<{
    labels: string[];
    athletes: ESPNAthleteStats[];
  }>;
}

export interface ESPNSummary {
  boxscore: {
    players: ESPNPlayerStats[];
  };
}

export async function fetchGameSummary(sport: Sport, gameId: string): Promise<ESPNSummary | null> {
  const path = getESPNPath(sport);
  const url = `${ESPN_BASE}/${path}/summary?event=${gameId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json as ESPNSummary;
  } catch {
    return null;
  }
}

// --- Sports News ---

export interface ESPNArticle {
  headline: string;
  description: string;
  published: string;
  links: { web: { href: string } };
  images?: Array<{ url: string }>;
}

export async function fetchSportNews(sport: Sport): Promise<ESPNArticle[]> {
  const path = getESPNPath(sport);
  const url = `${ESPN_BASE}/${path}/news?limit=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.articles || []) as ESPNArticle[];
  } catch {
    return [];
  }
}

export async function fetchTeamNews(sport: Sport, teamId: string): Promise<ESPNArticle[]> {
  const path = getESPNPath(sport);
  const url = `${ESPN_BASE}/${path}/news?limit=5&team=${teamId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.articles || []) as ESPNArticle[];
  } catch {
    return [];
  }
}

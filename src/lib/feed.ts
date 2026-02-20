// Client-side feed builder — replaces the /api/feed server route
import {
  FeedPost,
  TrendingPickData,
  BigGameData,
  PlayerPerformanceData,
  NewsData,
  HotPicksData,
  HotPickEntry,
  GameResultData,
  GameResultPickEntry,
  Sport,
  Game,
} from './types';
import {
  fetchGames,
  fetchGameSummary,
  fetchSportNews,
  fetchTeams,
  SPORT_CONFIGS,
  getPlayerHeadshotUrl,
  getCachedPerf,
  setCachedPerf,
} from './espn';
import { getPicksByDate } from './storage';
import { todayString, addDays, parseRecord } from './utils';

// --- Trending Pick ---

async function buildTrendingPick(games: Game[], date: string): Promise<FeedPost | null> {
  const picks = await getPicksByDate(date);
  if (picks.length === 0) return null;

  const teamCounts: Record<string, number> = {};
  const gameCounts: Record<string, number> = {};
  for (const pick of picks) {
    teamCounts[pick.pickedTeamId] = (teamCounts[pick.pickedTeamId] || 0) + 1;
    gameCounts[pick.gameId] = (gameCounts[pick.gameId] || 0) + 1;
  }

  let topTeamId = '';
  let topCount = 0;
  for (const [teamId, count] of Object.entries(teamCounts)) {
    if (count > topCount) { topTeamId = teamId; topCount = count; }
  }

  if (!topTeamId) return null;

  const game = games.find((g) => g.homeTeam.id === topTeamId || g.awayTeam.id === topTeamId);
  if (!game) return null;

  const isHome = game.homeTeam.id === topTeamId;
  const pickedTeam = isHome ? game.homeTeam : game.awayTeam;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  const data: TrendingPickData = {
    gameId: game.id,
    teamId: topTeamId,
    teamName: pickedTeam.displayName,
    teamAbbreviation: pickedTeam.abbreviation,
    teamLogo: pickedTeam.logo,
    opponentName: opponent.displayName,
    opponentAbbreviation: opponent.abbreviation,
    opponentLogo: opponent.logo,
    pickCount: topCount,
    totalPicksForGame: gameCounts[game.id] || topCount,
    gameDate: game.date,
    startTime: game.startTime,
    sport: game.sport,
  };

  return {
    id: `trending-${date}`,
    type: 'trending_pick',
    timestamp: Date.now(),
    sport: game.sport,
    data,
  };
}

// --- Hot Picks ---

async function buildHotPicks(games: Game[], date: string): Promise<FeedPost | null> {
  const picks = await getPicksByDate(date);
  if (picks.length === 0) return null;

  const gameMap = new Map(games.map((g) => [g.id, g]));
  const seenUsers = new Set<string>();
  const entries: HotPickEntry[] = [];

  for (const pick of picks) {
    if (seenUsers.has(pick.username)) continue;
    const game = gameMap.get(pick.gameId);
    if (!game) continue;

    const isHome = game.homeTeam.id === pick.pickedTeamId;
    const pickedTeam = isHome ? game.homeTeam : game.awayTeam;
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    entries.push({
      username: pick.username,
      pickedTeamId: pick.pickedTeamId,
      pickedTeamName: pickedTeam.displayName,
      pickedTeamAbbreviation: pickedTeam.abbreviation,
      pickedTeamLogo: pickedTeam.logo,
      opponentAbbreviation: opponent.abbreviation,
      opponentLogo: opponent.logo,
      sport: game.sport,
      gameId: game.id,
    });

    seenUsers.add(pick.username);
    if (entries.length >= 5) break;
  }

  if (entries.length === 0) return null;

  const headline =
    entries.length === 1
      ? `${entries[0].username} is locked in today`
      : `${entries.length} picks are in — see who's riding who`;

  const data: HotPicksData = { date, picks: entries, headline };

  return {
    id: `hotpicks-${date}`,
    type: 'hot_picks',
    timestamp: Date.now() - 30000,
    sport: entries[0].sport,
    data,
  };
}

// --- Big Game ---

function scoreBigGame(game: Game): number {
  let score = 0;
  const homeRec = parseRecord(game.homeTeam.record);
  const awayRec = parseRecord(game.awayTeam.record);
  const homeGames = homeRec.wins + homeRec.losses || 1;
  const awayGames = awayRec.wins + awayRec.losses || 1;
  const homeWinPct = homeRec.wins / homeGames;
  const awayWinPct = awayRec.wins / awayGames;
  const winPctDiff = Math.abs(homeWinPct - awayWinPct);
  if (winPctDiff > 0.25) return 0;
  if (winPctDiff > 0.15) score -= 1;
  if (homeRec.wins > homeRec.losses && awayRec.wins > awayRec.losses) score += 2;
  if (game.homeScore !== null && game.awayScore !== null) {
    const diff = Math.abs(game.homeScore - game.awayScore);
    if (diff <= 5) score += 3;
    else if (diff <= 10) score += 1;
    if (diff >= 20) return 0;
    if (diff >= 15) score -= 2;
  }
  if (homeRec.wins + awayRec.wins > 60) score += 1;
  if (game.status === 'scheduled') {
    if (homeWinPct > 0.6 && awayWinPct > 0.6) score += 2;
    if (winPctDiff < 0.05 && homeWinPct > 0.5 && awayWinPct > 0.5) score += 1;
  }
  return score;
}

function getBigGameHeadline(game: Game): string {
  const homeRec = parseRecord(game.homeTeam.record);
  const awayRec = parseRecord(game.awayTeam.record);
  const homeGames = homeRec.wins + homeRec.losses || 1;
  const awayGames = awayRec.wins + awayRec.losses || 1;
  const homeWinPct = homeRec.wins / homeGames;
  const awayWinPct = awayRec.wins / awayGames;
  const winPctDiff = Math.abs(homeWinPct - awayWinPct);
  if (game.homeScore !== null && game.awayScore !== null) {
    const diff = Math.abs(game.homeScore - game.awayScore);
    if (diff <= 3 && game.status === 'final') return 'Nail-Biter Finish';
    if (diff <= 5 && game.status === 'in_progress') return 'Close Game Alert';
    if (diff <= 8 && game.status === 'final') return 'Down-to-the-Wire';
  }
  if (homeWinPct > 0.65 && awayWinPct > 0.65) return 'Elite Matchup';
  if (winPctDiff < 0.05 && homeWinPct > 0.5) return 'Dead-Even Clash';
  if (homeRec.wins > homeRec.losses && awayRec.wins > awayRec.losses) return 'Playoff-Caliber Clash';
  return 'Must-Watch Game';
}

function buildBigGames(games: Game[]): FeedPost[] {
  const scored = games
    .map((game) => ({ game, score: scoreBigGame(game) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return scored.map(({ game }) => {
    const data: BigGameData = {
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      startTime: game.startTime,
      gameDate: game.date,
      sport: game.sport,
      headline: getBigGameHeadline(game),
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: game.status,
    };
    return {
      id: `biggame-${game.id}`,
      type: 'big_game' as const,
      timestamp: Date.now() - 60000,
      sport: game.sport,
      data,
    };
  });
}

// --- Player Performance ---

interface StandoutThresholds { [key: string]: number }

const SPORT_THRESHOLDS: Record<Sport, { labelKey: string; thresholds: StandoutThresholds }[]> = {
  nba: [
    { labelKey: 'PTS', thresholds: { PTS: 30 } },
    { labelKey: 'REB', thresholds: { REB: 15 } },
    { labelKey: 'AST', thresholds: { AST: 12 } },
  ],
  nfl: [{ labelKey: 'YDS', thresholds: { YDS: 300 } }, { labelKey: 'TD', thresholds: { TD: 3 } }],
  nhl: [{ labelKey: 'G', thresholds: { G: 3 } }],
  mlb: [{ labelKey: 'HR', thresholds: { HR: 3 } }, { labelKey: 'RBI', thresholds: { RBI: 5 } }],
};

function isStandout(sport: Sport, statMap: Record<string, number>): boolean {
  const thresholdSets = SPORT_THRESHOLDS[sport] || [];
  for (const { labelKey, thresholds } of thresholdSets) {
    if ((statMap[labelKey] || 0) >= (thresholds[labelKey] || Infinity)) return true;
  }
  if (sport === 'nba') {
    const pts = statMap['PTS'] || 0;
    const reb = statMap['REB'] || 0;
    const ast = statMap['AST'] || 0;
    if (pts >= 25 && (reb >= 10 || ast >= 10)) return true;
  }
  return false;
}

function buildStatHeadline(sport: Sport, statMap: Record<string, number>): string {
  const parts: string[] = [];
  if (sport === 'nba') {
    if (statMap['PTS']) parts.push(`${statMap['PTS']} PTS`);
    if (statMap['REB']) parts.push(`${statMap['REB']} REB`);
    if (statMap['AST']) parts.push(`${statMap['AST']} AST`);
    if (statMap['STL'] && statMap['STL'] >= 3) parts.push(`${statMap['STL']} STL`);
    if (statMap['BLK'] && statMap['BLK'] >= 3) parts.push(`${statMap['BLK']} BLK`);
  } else if (sport === 'nfl') {
    if (statMap['YDS']) parts.push(`${statMap['YDS']} YDS`);
    if (statMap['TD']) parts.push(`${statMap['TD']} TD`);
  } else if (sport === 'nhl') {
    if (statMap['G']) parts.push(`${statMap['G']} G`);
    if (statMap['A']) parts.push(`${statMap['A']} A`);
  } else if (sport === 'mlb') {
    if (statMap['HR']) parts.push(`${statMap['HR']} HR`);
    if (statMap['RBI']) parts.push(`${statMap['RBI']} RBI`);
    if (statMap['H']) parts.push(`${statMap['H']} H`);
  }
  return parts.join(' | ') || 'Great Game';
}

async function buildPlayerPerformances(allGames: Game[], maxPosts = 20): Promise<FeedPost[]> {
  const finalGames = allGames.filter((g) => g.status === 'final');
  const posts: FeedPost[] = [];

  for (const game of finalGames) {
    if (posts.length >= maxPosts) break;

    const cacheKey = `perf-${game.id}`;
    const cached = getCachedPerf(cacheKey);
    if (cached) {
      posts.push(...(cached.data as FeedPost[]));
      continue;
    }

    const summary = await fetchGameSummary(game.sport, game.id);
    if (!summary?.boxscore?.players) {
      setCachedPerf(cacheKey, []);
      continue;
    }

    const gamePosts: FeedPost[] = [];

    for (const teamStats of summary.boxscore.players) {
      if (!teamStats.statistics?.[0]) continue;
      const labels = teamStats.statistics[0].labels;
      const athletes = teamStats.statistics[0].athletes;

      for (const athlete of athletes) {
        const statMap: Record<string, number> = {};
        labels.forEach((label, idx) => {
          const val = parseFloat(athlete.stats[idx]);
          if (!isNaN(val)) statMap[label] = val;
        });

        if (isStandout(game.sport, statMap)) {
          const isHomeTeam = teamStats.team.abbreviation === game.homeTeam.abbreviation;
          const thisTeam = isHomeTeam ? game.homeTeam : game.awayTeam;
          const opponent = isHomeTeam ? game.awayTeam : game.homeTeam;
          const isWin = isHomeTeam
            ? (game.homeScore || 0) > (game.awayScore || 0)
            : (game.awayScore || 0) > (game.homeScore || 0);

          const playerImageUrl =
            athlete.athlete.headshot?.href ||
            getPlayerHeadshotUrl(game.sport, athlete.athlete.id);

          const data: PlayerPerformanceData = {
            playerName: athlete.athlete.displayName,
            playerImageUrl,
            teamId: thisTeam.id,
            teamAbbreviation: thisTeam.abbreviation,
            teamLogo: thisTeam.logo,
            sport: game.sport,
            stats: statMap,
            headline: buildStatHeadline(game.sport, statMap),
            gameId: game.id,
            opponentAbbreviation: opponent.abbreviation,
            gameDate: game.date,
            isWin,
          };

          gamePosts.push({
            id: `perf-${game.id}-${athlete.athlete.id}`,
            type: 'player_performance',
            timestamp: new Date(game.startTime).getTime(),
            sport: game.sport,
            data,
          });
        }
      }
    }

    setCachedPerf(cacheKey, gamePosts);
    posts.push(...gamePosts);
  }

  return posts.slice(0, maxPosts);
}

// --- Game Results ---

async function buildGameResults(games: Game[]): Promise<FeedPost[]> {
  const posts: FeedPost[] = [];

  for (const game of games) {
    if (game.status !== 'final') continue;
    if (game.homeScore === null || game.awayScore === null) continue;

    const winnerId = game.homeScore > game.awayScore ? game.homeTeam.id : game.awayTeam.id;
    const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;

    const gamePicks = await getPicksByDate(game.date);
    const filtered = gamePicks.filter((p) => p.gameId === game.id);
    if (filtered.length === 0) continue;

    const entries: GameResultPickEntry[] = filtered.slice(0, 5).map((p) => {
      const isHome = p.pickedTeamId === game.homeTeam.id;
      const pickedTeam = isHome ? game.homeTeam : game.awayTeam;
      return {
        username: p.username,
        pickedTeamId: p.pickedTeamId,
        pickedTeamAbbreviation: pickedTeam.abbreviation,
        pickedTeamLogo: pickedTeam.logo,
        correct: p.pickedTeamId === winnerId,
      };
    });

    const data: GameResultData = {
      gameId: game.id,
      sport: game.sport,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      gameDate: game.date,
      winnerAbbreviation: winner.abbreviation,
      correctPickers: entries.filter((e) => e.correct),
      totalPickers: filtered.length,
    };

    posts.push({
      id: `gameresult-${game.id}`,
      type: 'game_result',
      timestamp: new Date(game.startTime).getTime() + 3 * 3600000,
      sport: game.sport,
      data,
    });
  }

  return posts;
}

// --- News ---

async function buildNewsPosts(): Promise<FeedPost[]> {
  type RawArticle = {
    article: { headline: string; description: string; published: string; links: { web: { href: string } }; images?: Array<{ url: string }> };
    sport: Sport;
    teamAbbreviations: string[];
  };

  const allArticles: RawArticle[] = [];

  await Promise.all(
    SPORT_CONFIGS.map(async ({ sport }) => {
      const leagueArticles = await fetchSportNews(sport);
      for (const article of leagueArticles.slice(0, 5)) {
        allArticles.push({ article, sport, teamAbbreviations: [] });
      }
    })
  );

  const byLink = new Map<string, RawArticle>();
  for (const item of allArticles) {
    const key = item.article.links?.web?.href || item.article.headline;
    const existing = byLink.get(key);
    if (existing) {
      existing.teamAbbreviations = Array.from(new Set([...existing.teamAbbreviations, ...item.teamAbbreviations]));
    } else {
      byLink.set(key, { ...item, teamAbbreviations: [...item.teamAbbreviations] });
    }
  }

  const deduped = Array.from(byLink.values());
  deduped.sort((a, b) => new Date(b.article.published).getTime() - new Date(a.article.published).getTime());

  return deduped.map(({ article, sport, teamAbbreviations }) => {
    const data: NewsData = {
      headline: article.headline,
      description: article.description || '',
      imageUrl: article.images?.[0]?.url,
      linkUrl: article.links?.web?.href || '',
      sport,
      published: article.published,
      teamAbbreviations,
    };
    return {
      id: `news-${sport}-${new Date(article.published).getTime()}-${teamAbbreviations.join('-')}`,
      type: 'news' as const,
      timestamp: new Date(article.published).getTime(),
      sport,
      data,
    };
  });
}

// --- Main feed builder ---

const DAYS_PER_PAGE = 5;
const MAX_DAYS = 50;

export async function buildFeedPage(daysOffset: number): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const today = todayString();
  const windowStart = daysOffset;
  const windowEnd = Math.min(daysOffset + DAYS_PER_PAGE - 1, MAX_DAYS - 1);
  const hasMore = windowEnd < MAX_DAYS - 1;

  const dates: string[] = [];
  for (let i = windowStart; i <= windowEnd; i++) {
    dates.push(addDays(today, -i));
  }

  const gamesByDate = await Promise.all(dates.map((d) => fetchGames(d)));
  const windowGames = gamesByDate.flat();
  const todayGames = daysOffset === 0 ? gamesByDate[0] : [];

  const [trendingPick, hotPicksPost, newsPosts, playerPosts, gameResultPosts] = await Promise.all([
    daysOffset === 0 ? buildTrendingPick(todayGames, today) : Promise.resolve(null),
    daysOffset === 0 ? buildHotPicks(todayGames, today) : Promise.resolve(null),
    daysOffset === 0 ? buildNewsPosts() : Promise.resolve([]),
    buildPlayerPerformances(windowGames, 20),
    buildGameResults(windowGames),
  ]);

  const bigGamePosts = buildBigGames(windowGames);

  const posts: FeedPost[] = [];
  if (trendingPick) posts.push(trendingPick);
  if (hotPicksPost) posts.push(hotPicksPost);
  posts.push(...bigGamePosts);
  posts.push(...gameResultPosts);
  posts.push(...playerPosts);
  posts.push(...newsPosts);

  posts.sort((a, b) => b.timestamp - a.timestamp);

  return { posts, hasMore };
}

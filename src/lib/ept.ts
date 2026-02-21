// ─── Generic types ───

export interface EPTPlayerBase {
  rank: number;
  name: string;
  team: string;
  ept: number;
  group?: string;
  imageUrl?: string;
  stats: Record<string, number | string>;
}

export interface EPTGroupedResponse {
  groups: Record<string, EPTPlayerBase[]>;
  season: string | number;
  updatedAt: string;
  formula: Record<string, string>;
}

// ─── NBA ───

function getNBASeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 9 ? year : year - 1;
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, '0')}`;
}

function calcNBAEPT(pts: number, reb: number, ast: number, stl: number, blk: number, tov: number): number {
  return +(pts * 1.5 + reb * 1.5 + ast * 1.5 + stl * 3 + blk * 3 - tov * 1.5).toFixed(1);
}

interface NBALeadersResponse {
  resultSet: { headers: string[]; rowSet: (string | number)[][] };
}

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export async function fetchNBAEPT(): Promise<EPTGroupedResponse> {
  const season = getNBASeason();
  const nbaUrl =
    `https://stats.nba.com/stats/leagueLeaders?` +
    `ActiveFlag=&LeagueID=00&PerMode=Totals&Scope=S` +
    `&Season=${season}&SeasonType=Regular+Season&StatCategory=PTS`;

  const res = await fetch(CORS_PROXY + encodeURIComponent(nbaUrl));
  if (!res.ok) throw new Error(`NBA API returned ${res.status}`);

  const data: NBALeadersResponse = await res.json();
  const headers = data.resultSet.headers;
  const rows = data.resultSet.rowSet;
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => (idx[h] = i));

  const players: EPTPlayerBase[] = rows.map((r) => {
    const playerId = r[idx['PLAYER_ID']] as number;
    const gp = (r[idx['GP']] as number) ?? 0;
    const pts = (r[idx['PTS']] as number) ?? 0;
    const reb = (r[idx['REB']] as number) ?? 0;
    const ast = (r[idx['AST']] as number) ?? 0;
    const stl = (r[idx['STL']] as number) ?? 0;
    const blk = (r[idx['BLK']] as number) ?? 0;
    const tov = (r[idx['TOV']] as number) ?? 0;
    const fgPct = (r[idx['FG_PCT']] as number) ?? 0;
    const fg3Pct = (r[idx['FG3_PCT']] as number) ?? 0;
    const ftPct = (r[idx['FT_PCT']] as number) ?? 0;
    return {
      rank: 0,
      name: r[idx['PLAYER']] as string,
      team: r[idx['TEAM']] as string,
      imageUrl: `https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`,
      ept: calcNBAEPT(pts, reb, ast, stl, blk, tov),
      stats: {
        GP: gp,
        PPG: gp ? +(pts / gp).toFixed(1) : 0,
        RPG: gp ? +(reb / gp).toFixed(1) : 0,
        APG: gp ? +(ast / gp).toFixed(1) : 0,
        SPG: gp ? +(stl / gp).toFixed(1) : 0,
        BPG: gp ? +(blk / gp).toFixed(1) : 0,
        'FG%': fgPct ? `${(fgPct * 100).toFixed(1)}%` : '—',
        '3P%': fg3Pct ? `${(fg3Pct * 100).toFixed(1)}%` : '—',
        'FT%': ftPct ? `${(ftPct * 100).toFixed(1)}%` : '—',
      },
    };
  });

  players.sort((a, b) => b.ept - a.ept);
  players.forEach((p, i) => (p.rank = i + 1));

  return {
    groups: { all: players },
    season,
    updatedAt: new Date().toISOString(),
    formula: {
      all: 'EPT = (PTS × 1.5) + (REB × 1.5) + (AST × 1.5) + (STL × 3) + (BLK × 3) - (TOV × 1.5)',
    },
  };
}

// ─── MLB ───

function getMLBSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 3 ? year : year - 1;
}

function calcHitterEPT(hits: number, hr: number, rbi: number, runs: number, sb: number, bb: number): number {
  return +(hits * 1.5 + hr * 4 + rbi * 1.5 + runs * 1.5 + sb * 3 + bb * 1).toFixed(1);
}

interface PitcherStats {
  wins: number; losses: number; so: number; er: number; bb: number; saves: number; ipNum: number;
}

function calcPitcherEPT(p: PitcherStats): number {
  return +((p.wins * 8) + (p.so * 0.5) + (p.saves * 5) - (p.losses * 4) - (p.er * 0.8) + (p.ipNum * 0.5) - (p.bb * 0.5)).toFixed(1);
}

interface MLBStatsResponse {
  stats?: Array<{ splits?: Array<{ player: { id: number; fullName: string }; team?: { name: string }; stat: Record<string, unknown> }> }>;
}

export async function fetchMLBEPT(): Promise<EPTGroupedResponse> {
  const season = getMLBSeason();

  const [hittingRes, pitchingRes] = await Promise.all([
    fetch(`https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=${season}&sortStat=hits&order=desc&limit=200&sportId=1`),
    fetch(`https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=${season}&sortStat=earnedRunAverage&order=asc&limit=200&sportId=1`),
  ]);

  const hittingData: MLBStatsResponse = hittingRes.ok ? await hittingRes.json() : {};
  const pitchingData: MLBStatsResponse = pitchingRes.ok ? await pitchingRes.json() : {};

  // Parse hitters
  const hitters: EPTPlayerBase[] = [];
  if (hittingData?.stats?.[0]?.splits) {
    for (const s of hittingData.stats[0].splits) {
      const st = s.stat as Record<string, number>;
      const hits = st.hits ?? 0, hr = st.homeRuns ?? 0, rbi = st.rbi ?? 0;
      const runs = st.runs ?? 0, sb = st.stolenBases ?? 0, bb = st.baseOnBalls ?? 0;
      hitters.push({
        rank: 0,
        name: s.player.fullName,
        team: s.team?.name ?? '—',
        imageUrl: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${s.player.id}/headshot/67/current`,
        ept: calcHitterEPT(hits, hr, rbi, runs, sb, bb),
        stats: {
          G: st.gamesPlayed ?? 0, AVG: (st as Record<string, unknown>).avg as string ?? '.000',
          H: hits, HR: hr, RBI: rbi, R: runs, SB: sb, BB: bb,
          OPS: (st as Record<string, unknown>).ops as string ?? '.000',
        },
      });
    }
  }
  hitters.sort((a, b) => b.ept - a.ept);
  hitters.forEach((p, i) => (p.rank = i + 1));

  // Parse pitchers
  const pitchers: EPTPlayerBase[] = [];
  if (pitchingData?.stats?.[0]?.splits) {
    for (const s of pitchingData.stats[0].splits) {
      const st = s.stat as Record<string, unknown>;
      const wins = (st.wins as number) ?? 0, losses = (st.losses as number) ?? 0;
      const so = (st.strikeOuts as number) ?? 0, er = (st.earnedRuns as number) ?? 0;
      const bb = (st.baseOnBalls as number) ?? 0, saves = (st.saves as number) ?? 0;
      const ip = String(st.inningsPitched ?? '0');
      const ipNum = parseFloat(ip) || 0;
      pitchers.push({
        rank: 0,
        name: s.player.fullName,
        team: s.team?.name ?? '—',
        imageUrl: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${s.player.id}/headshot/67/current`,
        ept: calcPitcherEPT({ wins, losses, so, er, bb, saves, ipNum }),
        stats: {
          G: (st.gamesPlayed as number) ?? 0, W: wins, L: losses,
          ERA: (st.era as string) ?? '0.00', SO: so, SV: saves,
          IP: ip, WHIP: (st.whip as string) ?? '0.00',
        },
      });
    }
  }
  pitchers.sort((a, b) => b.ept - a.ept);
  pitchers.forEach((p, i) => (p.rank = i + 1));

  return {
    groups: { hitting: hitters, pitching: pitchers },
    season,
    updatedAt: new Date().toISOString(),
    formula: {
      hitting: 'EPT = (H × 1.5) + (HR × 4) + (RBI × 1.5) + (R × 1.5) + (SB × 3) + (BB × 1)',
      pitching: 'EPT = (W × 8) + (SO × 0.5) + (SV × 5) - (L × 4) - (ER × 0.8) + (IP × 0.5) - (BB × 0.5)',
    },
  };
}

// ─── NHL ───

function getNHLSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}${startYear + 1}`;
}

function calcSkaterEPT(goals: number, assists: number, plusMinus: number, pim: number, ppg: number, shg: number, gwg: number, shots: number): number {
  return +(goals * 3 + assists * 2 + plusMinus * 0.5 + ppg * 1.5 + shg * 3 + gwg * 2 + shots * 0.1 - pim * 0.3).toFixed(1);
}

function calcGoalieEPT(wins: number, losses: number, gaa: number, svPct: number, shutouts: number, saves: number): number {
  return +(wins * 5 - losses * 2 - gaa * 3 + svPct * 50 + shutouts * 8 + saves * 0.05).toFixed(1);
}

export async function fetchNHLEPT(): Promise<EPTGroupedResponse> {
  const seasonId = getNHLSeason();
  const displaySeason = `${seasonId.slice(0, 4)}-${seasonId.slice(6)}`;

  const [skatersRes, goaliesRes] = await Promise.all([
    fetch(CORS_PROXY + encodeURIComponent(`https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=false&isGame=false&sort=%5B%7B%22property%22:%22points%22,%22direction%22:%22DESC%22%7D%5D&start=0&limit=200&cayenneExp=seasonId%3C=${seasonId}%20and%20seasonId%3E=${seasonId}%20and%20gameTypeId=2`)),
    fetch(CORS_PROXY + encodeURIComponent(`https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=false&isGame=false&sort=%5B%7B%22property%22:%22wins%22,%22direction%22:%22DESC%22%7D%5D&start=0&limit=100&cayenneExp=seasonId%3C=${seasonId}%20and%20seasonId%3E=${seasonId}%20and%20gameTypeId=2`)),
  ]);

  interface NHLSkaterRow {
    playerId: number;
    skaterFullName: string;
    teamAbbrevs: string;
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    penaltyMinutes: number;
    ppGoals: number;
    shGoals: number;
    gameWinningGoals: number;
    shots: number;
  }

  interface NHLGoalieRow {
    playerId: number;
    goalieFullName: string;
    teamAbbrevs: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    otLosses: number;
    goalsAgainstAverage: number;
    savePctg: number;
    shutouts: number;
    saves: number;
  }

  interface NHLStatsResponse<T> { data: T[] }

  const skatersData: NHLStatsResponse<NHLSkaterRow> = skatersRes.ok ? await skatersRes.json() : { data: [] };
  const goaliesData: NHLStatsResponse<NHLGoalieRow> = goaliesRes.ok ? await goaliesRes.json() : { data: [] };

  // Parse skaters
  const skaters: EPTPlayerBase[] = [];
  for (const s of skatersData.data || []) {
    skaters.push({
      rank: 0,
      name: s.skaterFullName,
      team: s.teamAbbrevs || '—',
      imageUrl: `https://assets.nhle.com/mugs/nhl/${seasonId}/${s.teamAbbrevs || 'NHL'}/${s.playerId}.png`,
      ept: calcSkaterEPT(s.goals, s.assists, s.plusMinus, s.penaltyMinutes, s.ppGoals, s.shGoals, s.gameWinningGoals, s.shots),
      stats: {
        GP: s.gamesPlayed, G: s.goals, A: s.assists, PTS: s.points,
        '+/-': s.plusMinus, PIM: s.penaltyMinutes, PPG: s.ppGoals, SOG: s.shots,
      },
    });
  }
  skaters.sort((a, b) => b.ept - a.ept);
  skaters.forEach((p, i) => (p.rank = i + 1));

  // Parse goalies
  const goalies: EPTPlayerBase[] = [];
  for (const g of goaliesData.data || []) {
    goalies.push({
      rank: 0,
      name: g.goalieFullName,
      team: g.teamAbbrevs || '—',
      imageUrl: `https://assets.nhle.com/mugs/nhl/${seasonId}/${g.teamAbbrevs || 'NHL'}/${g.playerId}.png`,
      ept: calcGoalieEPT(g.wins, g.losses + (g.otLosses || 0), g.goalsAgainstAverage, g.savePctg, g.shutouts, g.saves),
      stats: {
        GP: g.gamesPlayed, W: g.wins, L: g.losses, OTL: g.otLosses || 0,
        GAA: +g.goalsAgainstAverage.toFixed(2), 'SV%': +(g.savePctg * 100).toFixed(1), SO: g.shutouts, SV: g.saves,
      },
    });
  }
  goalies.sort((a, b) => b.ept - a.ept);
  goalies.forEach((p, i) => (p.rank = i + 1));

  return {
    groups: { skaters: skaters, goalies: goalies },
    season: displaySeason,
    updatedAt: new Date().toISOString(),
    formula: {
      skaters: 'EPT = (G × 3) + (A × 2) + (+/- × 0.5) + (PPG × 1.5) + (SHG × 3) + (GWG × 2) + (SOG × 0.1) - (PIM × 0.3)',
      goalies: 'EPT = (W × 5) - (L × 2) - (GAA × 3) + (SV% × 50) + (SO × 8) + (SV × 0.05)',
    },
  };
}

// ─── NFL ───

function getNFLSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? year : year - 1;
}

const NFL_TEAMS: Record<number, string> = {
  1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',
  11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',
  21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WSH',29:'CAR',30:'JAX',
  33:'BAL',34:'HOU',
};

const DEF_POSITIONS = new Set(['DE','DT','LB','ILB','OLB','MLB','CB','SS','FS','S','DB','NT','DL']);

interface NFLLeadersResponse {
  categories?: Array<{
    name: string;
    leaders?: Array<{
      athlete?: { $ref?: string };
      team?: { $ref?: string };
    }>;
  }>;
}

interface NFLAthleteResponse {
  displayName?: string;
  position?: { abbreviation?: string };
}

interface NFLStatsResponse {
  splits?: {
    categories?: Array<{
      name: string;
      stats?: Array<{ name: string; value: number }>;
    }>;
  };
}

async function safeFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchNFLEPT(): Promise<EPTGroupedResponse> {
  const season = getNFLSeason();
  const BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

  // Step 1: Fetch leaders
  const leadersData = await safeFetch(`${BASE}/seasons/${season}/types/2/leaders?limit=50`) as NFLLeadersResponse | null;
  if (!leadersData?.categories) throw new Error('Could not fetch NFL stats');

  const wantedCats: Record<string, number> = {
    passingYards: 12, rushingYards: 12,
    receivingYards: 40, receptions: 40, receivingTouchdowns: 30,
    totalTackles: 15, sacks: 12, interceptions: 10, passesDefended: 10,
    totalPoints: 10,
  };

  const athleteInfo: Record<string, { teamId: string }> = {};
  for (const cat of leadersData.categories) {
    const limit = wantedCats[cat.name];
    if (!limit) continue;
    for (const leader of (cat.leaders || []).slice(0, limit)) {
      const aRef = leader.athlete?.$ref || '';
      const tRef = leader.team?.$ref || '';
      const aid = aRef.split('/athletes/')[1]?.split('?')[0];
      const tid = tRef.split('/teams/')[1]?.split('?')[0];
      if (!aid) continue;
      if (!athleteInfo[aid]) athleteInfo[aid] = { teamId: tid || '' };
      if (tid) athleteInfo[aid].teamId = tid;
    }
  }

  // Step 2: Fetch bios + stats in batches
  const aids = Object.keys(athleteInfo);
  const groups: Record<string, EPTPlayerBase[]> = { qb: [], rb: [], wr: [], te: [], def: [], k: [] };

  const batchSize = 20;
  for (let i = 0; i < aids.length; i += batchSize) {
    const batch = aids.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.flatMap((aid) => [
        safeFetch(`${BASE}/athletes/${aid}`) as Promise<NFLAthleteResponse | null>,
        safeFetch(`${BASE}/seasons/${season}/types/2/athletes/${aid}/statistics/0`) as Promise<NFLStatsResponse | null>,
      ])
    );

    for (let j = 0; j < batch.length; j++) {
      const bio = results[j * 2] as NFLAthleteResponse | null;
      const statsData = results[j * 2 + 1] as NFLStatsResponse | null;
      if (!bio || !statsData?.splits?.categories) continue;

      const aid = batch[j];
      const name = bio.displayName || 'Unknown';
      const pos = bio.position?.abbreviation || '?';
      const team = NFL_TEAMS[+athleteInfo[aid].teamId] || '—';

      // Extract stats by category
      const catStats: Record<string, Record<string, number>> = {};
      for (const cat of statsData.splits.categories) {
        catStats[cat.name] = {};
        for (const stat of cat.stats || []) {
          catStats[cat.name][stat.name] = +stat.value || 0;
        }
      }
      const gen = catStats.general || {};
      const pass = catStats.passing || {};
      const rush = catStats.rushing || {};
      const rec = catStats.receiving || {};
      const def_ = catStats.defensive || {};
      const defInt = catStats.defensiveInterceptions || {};
      const kick = catStats.kicking || {};
      const gp = gen.gamesPlayed || pass.teamGamesPlayed || rush.teamGamesPlayed || def_.teamGamesPlayed || 0;

      if (pos === 'QB' && (pass.passingYards || 0) > 0) {
        const passYds = pass.passingYards || 0, passTD = pass.passingTouchdowns || 0;
        const int = pass.interceptions || 0, rushYds = rush.rushingYards || 0, rushTD = rush.rushingTouchdowns || 0;
        const ept = +((passYds * 0.04) + (passTD * 6) - (int * 4) + (rushYds * 0.1) + (rushTD * 6)).toFixed(1);
        groups.qb.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, 'PASS YDS': passYds, 'PASS TD': passTD, INT: int, 'RUSH YDS': rushYds, 'RTG': +(pass.QBRating || 0).toFixed(1) },
        });
      } else if (['RB', 'FB'].includes(pos)) {
        const rushYds = rush.rushingYards || 0, recYds = rec.receivingYards || 0;
        const totalTD = (rush.rushingTouchdowns || 0) + (rec.receivingTouchdowns || 0);
        const receptions = rec.receptions || 0, fumbles = gen.fumbles || gen.fumblesLost || 0;
        const ept = +((rushYds * 0.1) + (recYds * 0.1) + (totalTD * 6) + (receptions * 0.5) - (fumbles * 4)).toFixed(1);
        groups.rb.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, 'RUSH YDS': rushYds, 'REC YDS': recYds, TD: totalTD, REC: receptions },
        });
      } else if (pos === 'WR') {
        const rushYds = rush.rushingYards || 0, recYds = rec.receivingYards || 0;
        const totalTD = (rush.rushingTouchdowns || 0) + (rec.receivingTouchdowns || 0);
        const receptions = rec.receptions || 0, fumbles = gen.fumbles || gen.fumblesLost || 0;
        const ept = +((rushYds * 0.1) + (recYds * 0.1) + (totalTD * 6) + (receptions * 0.5) - (fumbles * 4)).toFixed(1);
        groups.wr.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, REC: receptions, 'REC YDS': recYds, TD: totalTD },
        });
      } else if (pos === 'TE') {
        const rushYds = rush.rushingYards || 0, recYds = rec.receivingYards || 0;
        const totalTD = (rush.rushingTouchdowns || 0) + (rec.receivingTouchdowns || 0);
        const receptions = rec.receptions || 0, fumbles = gen.fumbles || gen.fumblesLost || 0;
        const ept = +((rushYds * 0.1) + (recYds * 0.1) + (totalTD * 6) + (receptions * 0.5) - (fumbles * 4)).toFixed(1);
        groups.te.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, REC: receptions, 'REC YDS': recYds, TD: totalTD },
        });
      } else if (DEF_POSITIONS.has(pos)) {
        const tackles = def_.totalTackles || 0, sacks = +(def_.sacks || 0).toFixed(1);
        const int = defInt.interceptions || 0, tfl = def_.tacklesForLoss || def_.stuffs || 0;
        const ff = gen.fumblesForced || 0, pd = def_.passesDefended || def_.passesBattedDown || 0;
        const defTD = def_.miscTouchdowns || 0;
        const ept = +((tackles * 1) + (sacks * 4) + (int * 6) + (tfl * 2) + (ff * 4) + (pd * 2) + (defTD * 6)).toFixed(1);
        groups.def.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, TKL: tackles, SACK: sacks, INT: int, TFL: tfl, FF: ff, PD: pd },
        });
      } else if (pos === 'K' || pos === 'PK') {
        const fgm = kick.fieldGoalsMade || 0, fga = kick.fieldGoalAttempts || kick.fieldGoalsAttempted || 0;
        const longFG = kick.longFieldGoalMade || 0, xpm = kick.extraPointsMade || 0;
        const ept = +((fgm * 3) + (xpm * 1) + (longFG * 0.1) - ((fga - fgm) * 2)).toFixed(1);
        groups.k.push({
          rank: 0, name, team, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`, ept,
          stats: { GP: gp, FGM: fgm, FGA: fga, XPM: xpm, 'LONG FG': longFG },
        });
      }
    }
  }

  // Sort each group and assign global ranks
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.ept - a.ept);
    groups[key].forEach((p, i) => (p.rank = i + 1));
  }

  return {
    groups,
    season,
    updatedAt: new Date().toISOString(),
    formula: {
      qb: 'EPT = (Pass YDS × 0.04) + (Pass TD × 6) - (INT × 4) + (Rush YDS × 0.1) + (Rush TD × 6)',
      rb: 'EPT = (Rush YDS × 0.1) + (Rec YDS × 0.1) + (TD × 6) + (REC × 0.5) - (FUM × 4)',
      wr: 'EPT = (Rush YDS × 0.1) + (Rec YDS × 0.1) + (TD × 6) + (REC × 0.5) - (FUM × 4)',
      te: 'EPT = (Rush YDS × 0.1) + (Rec YDS × 0.1) + (TD × 6) + (REC × 0.5) - (FUM × 4)',
      def: 'EPT = (TKL × 1) + (SACK × 4) + (INT × 6) + (TFL × 2) + (FF × 4) + (PD × 2) + (DEF TD × 6)',
      k: 'EPT = (FGM × 3) + (XPM × 1) + (Long FG × 0.1) - ((FGA - FGM) × 2)',
    },
  };
}

import { Game, Pick, PointsBreakdown } from './types';
import { parseRecord } from './utils';

export function isUpset(
  game: Game,
  pickedTeamId: string
): { isUpset: boolean; isHeavy: boolean } {
  const homeRec = parseRecord(game.homeTeam.record);
  const awayRec = parseRecord(game.awayTeam.record);

  const pickedHome = pickedTeamId === game.homeTeam.id;
  const pickedWins = pickedHome ? homeRec.wins : awayRec.wins;
  const opponentWins = pickedHome ? awayRec.wins : homeRec.wins;

  if (pickedWins < opponentWins) {
    return {
      isUpset: true,
      isHeavy: opponentWins - pickedWins >= 5,
    };
  }

  return { isUpset: false, isHeavy: false };
}

export function calculatePickPoints(
  pick: Pick,
  game: Game,
  currentStreak: number
): PointsBreakdown {
  const winnerId = getWinnerId(game);
  if (!winnerId || pick.pickedTeamId !== winnerId) {
    return { base: 0, upsetBonus: 0, streakBonus: 0, total: 0 };
  }

  const base = 10;

  const upset = isUpset(game, pick.pickedTeamId);
  let upsetBonus = 0;
  if (upset.isHeavy) {
    upsetBonus = 10;
  } else if (upset.isUpset) {
    upsetBonus = 5;
  }

  const streakBonus = currentStreak >= 2 ? currentStreak * 2 : 0;

  return {
    base,
    upsetBonus,
    streakBonus,
    total: base + upsetBonus + streakBonus,
  };
}

export function getWinnerId(game: Game): string | null {
  if (game.status !== 'final') return null;
  if (game.homeScore === null || game.awayScore === null) return null;
  return game.homeScore > game.awayScore
    ? game.homeTeam.id
    : game.awayTeam.id;
}

export function isPerfectNight(
  picks: Pick[],
  games: Game[]
): boolean {
  if (picks.length < 3) return false;
  const finalPicks = picks.filter((p) => {
    const game = games.find((g) => g.id === p.gameId);
    return game && game.status === 'final';
  });
  return (
    finalPicks.length >= 3 &&
    finalPicks.every((p) => p.result === 'correct')
  );
}

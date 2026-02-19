import { NextRequest, NextResponse } from 'next/server';
import { getPicks, upsertPick, getPicksByUserAndDate } from '@/lib/storage';
import { fetchGames } from '@/lib/espn';
import { Game, Pick } from '@/lib/types';
import { addDays } from '@/lib/utils';

async function findGameAcrossDates(gameId: string, date: string): Promise<Game | null> {
  // Search the given date plus ±1 day to handle ESPN UTC boundary edge cases
  const dates = [date, addDays(date, -1), addDays(date, 1)];
  for (const d of dates) {
    const games = await fetchGames(d);
    const found = games.find((g) => g.id === gameId);
    if (found) return found;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { username, gameId, pickedTeamId, date, confidence } = await req.json();

    if (!username || !gameId || !pickedTeamId || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Enforce 3-picks-per-day limit (re-picking the same game doesn't count as a new pick)
    const todayPicks = getPicksByUserAndDate(username, date);
    const existingPickForThisGame = todayPicks.find((p) => p.gameId === gameId);
    if (!existingPickForThisGame) {
      const uniqueGamesPickedToday = new Set(todayPicks.map((p) => p.gameId)).size;
      if (uniqueGamesPickedToday >= 3) {
        return NextResponse.json({ error: 'Daily pick limit reached (3 picks per day)' }, { status: 400 });
      }
    }

    const game = await findGameAcrossDates(gameId, date);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'scheduled') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    const gameStart = new Date(game.startTime).getTime();
    if (Date.now() >= gameStart) {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    const pickId = `${username}-${gameId}`;
    const pick: Pick = {
      id: pickId,
      username,
      gameId,
      date,
      pickedTeamId,
      timestamp: Date.now(),
      result: 'pending',
      pointsEarned: 0,
      sport: game.sport,
      confidence: [1, 2, 3].includes(confidence) ? confidence as 1 | 2 | 3 : undefined,
    };

    upsertPick(pick);
    return NextResponse.json({ pick }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  const date = req.nextUrl.searchParams.get('date');

  if (username && date) {
    return NextResponse.json({ picks: getPicksByUserAndDate(username, date) });
  }

  if (username) {
    const picks = getPicks().filter((p) => p.username === username);
    return NextResponse.json({ picks });
  }

  if (date) {
    const picks = getPicks().filter((p) => p.date === date);
    return NextResponse.json({ picks });
  }

  return NextResponse.json({ picks: getPicks() });
}

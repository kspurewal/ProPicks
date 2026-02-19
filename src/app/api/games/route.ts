import { NextRequest, NextResponse } from 'next/server';
import { fetchGames } from '@/lib/espn';
import { todayString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || todayString();
  try {
    const games = await fetchGames(date);
    return NextResponse.json({ games, date });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

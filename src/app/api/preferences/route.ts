import { NextRequest, NextResponse } from 'next/server';
import { getUser, upsertUser } from '@/lib/storage';
import { Sport } from '@/lib/types';

const VALID_SPORTS: Sport[] = ['nba', 'mlb', 'nfl', 'nhl'];

export async function POST(req: NextRequest) {
  try {
    const { username, followedLeagues, followedTeams } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = getUser(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (Array.isArray(followedLeagues)) {
      user.followedLeagues = followedLeagues.filter((l: string) =>
        VALID_SPORTS.includes(l as Sport)
      ) as Sport[];
    }

    if (Array.isArray(followedTeams)) {
      user.followedTeams = followedTeams.filter(
        (t: unknown) => typeof t === 'string'
      ) as string[];
    }

    upsertUser(user);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

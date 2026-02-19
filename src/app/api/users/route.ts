import { NextRequest, NextResponse } from 'next/server';
import { getUsers, upsertUser, getUser } from '@/lib/storage';
import { User } from '@/lib/types';
import { getInappropriateReason } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const clean = username.trim();

    if (clean.length < 3 || clean.length > 20) {
      return NextResponse.json({ error: 'Username must be 3-20 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    const inappropriateReason = getInappropriateReason(clean);
    if (inappropriateReason) {
      return NextResponse.json({ error: inappropriateReason }, { status: 400 });
    }

    const existing = getUser(clean);
    if (existing) {
      return NextResponse.json({ user: existing });
    }

    const user: User = {
      username: clean,
      createdAt: Date.now(),
      totalPoints: 0,
      weeklyPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalPicks: 0,
      correctPicks: 0,
      badges: [],
      followedLeagues: [],
      followedTeams: [],
    };

    upsertUser(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (username) {
    const user = getUser(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user });
  }
  return NextResponse.json({ users: getUsers() });
}

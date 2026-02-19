import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/storage';
import { getBadgeDefinitions } from '@/lib/badges';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json({ badges: getBadgeDefinitions() });
  }

  const user = getUser(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ badges: user.badges });
}

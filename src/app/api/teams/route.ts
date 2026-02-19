import { NextResponse } from 'next/server';
import { fetchTeams, SPORT_CONFIGS } from '@/lib/espn';
import { readGameCache, writeGameCache } from '@/lib/storage';

export async function GET() {
  // Cache teams for 24 hours (they rarely change)
  const cacheKey = 'all-teams';
  const cached = readGameCache(cacheKey);
  if (cached) {
    const { data, ageMinutes } = cached as { data: unknown; ageMinutes: number };
    if (ageMinutes < 1440) {
      return NextResponse.json({ teams: data });
    }
  }

  const results = await Promise.all(
    SPORT_CONFIGS.map(({ sport }) => fetchTeams(sport))
  );

  const teams = results.flat();
  writeGameCache(cacheKey, teams);

  return NextResponse.json({ teams });
}

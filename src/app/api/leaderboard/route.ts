import { NextRequest, NextResponse } from 'next/server';
import { getUsers, readMeta, writeMeta, saveUsers } from '@/lib/storage';
import { getWeekNumber } from '@/lib/utils';
import { LeaderboardEntry } from '@/lib/types';

function checkWeeklyReset() {
  const meta = readMeta();
  const currentWeek = getWeekNumber();
  const currentYear = new Date().getFullYear();
  const weekKey = `${currentYear}-W${currentWeek}`;

  if (meta.lastWeekReset !== weekKey) {
    const users = getUsers();
    for (const user of users) {
      user.weeklyPoints = 0;
    }
    saveUsers(users);
    meta.lastWeekReset = weekKey;
    writeMeta(meta);
  }
}

export async function GET(req: NextRequest) {
  checkWeeklyReset();

  const type = req.nextUrl.searchParams.get('type') || 'alltime';
  const username = req.nextUrl.searchParams.get('username');
  const users = getUsers();

  const sorted = [...users].sort((a, b) => {
    if (type === 'weekly') return b.weeklyPoints - a.weeklyPoints;
    return b.totalPoints - a.totalPoints;
  });

  const entries: LeaderboardEntry[] = sorted.slice(0, 100).map((u, i) => ({
    rank: i + 1,
    username: u.username,
    totalPoints: u.totalPoints,
    weeklyPoints: u.weeklyPoints,
    currentStreak: u.currentStreak,
    accuracy: u.totalPicks > 0 ? Math.round((u.correctPicks / u.totalPicks) * 100) : 0,
  }));

  // If a username is provided and they're outside the top 100, return their rank separately
  let myRank: { rank: number; entry: LeaderboardEntry } | null = null;
  if (username) {
    const isInTop100 = entries.some((e) => e.username === username);
    if (!isInTop100) {
      const idx = sorted.findIndex((u) => u.username === username);
      if (idx !== -1) {
        const u = sorted[idx];
        myRank = {
          rank: idx + 1,
          entry: {
            rank: idx + 1,
            username: u.username,
            totalPoints: u.totalPoints,
            weeklyPoints: u.weeklyPoints,
            currentStreak: u.currentStreak,
            accuracy: u.totalPicks > 0 ? Math.round((u.correctPicks / u.totalPicks) * 100) : 0,
          },
        };
      }
    }
  }

  return NextResponse.json({ entries, type, myRank });
}

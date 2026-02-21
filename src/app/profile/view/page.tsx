'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import BadgeDisplay from '@/components/BadgeDisplay';
import { getUser, getPicksByUser, followUser, unfollowUser } from '@/lib/storage';
import { User, Pick, Sport } from '@/lib/types';

const SPORT_LABELS: Record<Sport, string> = { nba: 'NBA', mlb: 'MLB', nfl: 'NFL', nhl: 'NHL' };
const SPORT_COLORS: Record<Sport, string> = {
  nba: 'text-orange-400',
  mlb: 'text-red-400',
  nfl: 'text-emerald-400',
  nhl: 'text-sky-400',
};

export default function PublicProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const profileUsername = searchParams.get('username') || '';
  const { username: currentUser, user: currentUserData, refresh } = useUser();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!profileUsername) { setLoading(false); setNotFound(true); return; }
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const [userData, picksData] = await Promise.all([
          getUser(profileUsername),
          getPicksByUser(profileUsername),
        ]);
        if (!userData) { setNotFound(true); return; }
        setProfileUser(userData);
        setPicks(picksData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profileUsername]);

  const recentPicks = useMemo(
    () => [...picks].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
    [picks]
  );

  const sportStats = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const pick of picks) {
      if (!pick.sport || pick.result === 'pending' || pick.result === undefined) continue;
      if (!map[pick.sport]) map[pick.sport] = { correct: 0, total: 0 };
      map[pick.sport].total++;
      if (pick.result === 'correct') map[pick.sport].correct++;
    }
    return map;
  }, [picks]);

  const calendarDays = useMemo(() => {
    const byDate: Record<string, Pick[]> = {};
    for (const pick of picks) {
      if (!byDate[pick.date]) byDate[pick.date] = [];
      byDate[pick.date].push(pick);
    }
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayPicks = byDate[dateStr] || [];
      if (dayPicks.length === 0) return { date: dateStr, status: 'none' as const };
      const resolved = dayPicks.filter((p) => p.result !== 'pending');
      if (resolved.length === 0) return { date: dateStr, status: 'pending' as const };
      const allCorrect = resolved.every((p) => p.result === 'correct');
      const allWrong = resolved.every((p) => p.result === 'incorrect');
      if (allCorrect && !dayPicks.some((p) => p.result === 'pending')) return { date: dateStr, status: 'correct' as const };
      if (allWrong && !dayPicks.some((p) => p.result === 'pending')) return { date: dateStr, status: 'incorrect' as const };
      return { date: dateStr, status: 'mixed' as const };
    });
  }, [picks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profileUser) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-text-secondary">User not found</p>
        <Link href="/leaderboard" className="text-accent-green text-sm font-semibold hover:underline mt-4 inline-block">
          &larr; Back to Leaderboard
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser === profileUsername;
  const isFollowing = currentUserData?.following?.includes(profileUsername) ?? false;

  async function handleFollow() {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser, profileUsername);
        setProfileUser((prev) => prev ? { ...prev, followers: (prev.followers || []).filter((f) => f !== currentUser) } : prev);
      } else {
        await followUser(currentUser, profileUsername);
        setProfileUser((prev) => prev ? { ...prev, followers: [...(prev.followers || []), currentUser] } : prev);
      }
      refresh();
    } finally {
      setFollowLoading(false);
    }
  }

  const accuracy = profileUser.totalPicks > 0
    ? Math.round((profileUser.correctPicks / profileUser.totalPicks) * 100)
    : 0;
  const sportBreakdown = Object.entries(sportStats) as [Sport, { correct: number; total: number }][];

  return (
    <div>
      <Link href="/leaderboard" className="text-accent-green text-sm font-semibold hover:underline">
        &larr; Leaderboard
      </Link>

      <div className="text-center mt-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-extrabold text-accent-green">
            {profileUsername.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">{profileUsername}</h1>
        <p className="text-text-secondary text-sm mt-1">
          Member since {new Date(profileUser.createdAt).toLocaleDateString()}
        </p>
        <div className="flex justify-center gap-6 mt-2">
          <div className="text-center">
            <p className="text-sm font-bold text-text-primary">{profileUser.followers?.length || 0}</p>
            <p className="text-xs text-text-secondary">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-text-primary">{profileUser.following?.length || 0}</p>
            <p className="text-xs text-text-secondary">Following</p>
          </div>
        </div>
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`mt-3 px-5 py-1.5 text-sm rounded-lg font-semibold transition disabled:opacity-50 ${
              isFollowing
                ? 'bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400'
                : 'bg-accent-green text-white hover:bg-accent-green-hover'
            }`}
          >
            {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
        {isOwnProfile && (
          <Link href="/profile" className="text-xs text-accent-green hover:underline mt-1 inline-block">
            Edit your profile
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Points" value={profileUser.totalPoints} color="text-accent-green" />
        <StatBox label="Correct Picks" value={profileUser.correctPicks} color="text-correct" />
        <StatBox label="Accuracy" value={`${accuracy}%`} color="text-text-primary" />
        <StatBox label="Best Streak" value={profileUser.longestStreak} color="text-streak-fire" />
      </div>

      {profileUser.currentStreak > 0 && (
        <div className="bg-bg-card border border-streak-fire/20 rounded-xl p-4 mb-8 text-center">
          <p className="text-streak-fire text-3xl font-bold">{profileUser.currentStreak}</p>
          <p className="text-text-secondary text-sm">Current Winning Streak</p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">Last 30 Days</h2>
        <div className="bg-bg-card border border-white/5 rounded-xl p-4">
          <div className="grid grid-cols-10 gap-1.5">
            {calendarDays.map(({ date, status }) => (
              <div
                key={date}
                title={date}
                className={`w-full aspect-square rounded-sm ${
                  status === 'correct' ? 'bg-correct' :
                  status === 'incorrect' ? 'bg-incorrect' :
                  status === 'mixed' ? 'bg-amber-400' :
                  status === 'pending' ? 'bg-white/20' :
                  'bg-white/5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {sportBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3">Accuracy by Sport</h2>
          <div className="bg-bg-card border border-white/5 rounded-xl p-4 space-y-3">
            {sportBreakdown.sort(([, a], [, b]) => b.total - a.total).map(([sport, { correct, total }]) => {
              const pct = Math.round((correct / total) * 100);
              return (
                <div key={sport}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${SPORT_COLORS[sport]}`}>{SPORT_LABELS[sport]}</span>
                    <span className="text-xs text-text-secondary">
                      {correct}/{total} &mdash; <span className="text-text-primary font-semibold">{pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-accent-green rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-4">Badges</h2>
        <BadgeDisplay badges={profileUser.badges || []} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Picks</h2>
        {recentPicks.length === 0 ? (
          <p className="text-text-secondary text-sm">No picks yet.</p>
        ) : (
          <div className="space-y-2">
            {recentPicks.map((pick) => (
              <div
                key={pick.id}
                className="bg-bg-card border border-white/5 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm text-text-primary">{pick.date}</span>
                  <span className="text-text-secondary text-xs ml-2">Game {pick.gameId}</span>
                  {pick.sport && (
                    <span className={`text-xs ml-2 font-semibold ${SPORT_COLORS[pick.sport]}`}>
                      {SPORT_LABELS[pick.sport]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pick.result === 'correct' && <span className="text-correct text-sm font-semibold">+{pick.pointsEarned}</span>}
                  {pick.result === 'incorrect' && <span className="text-incorrect text-sm">MISS</span>}
                  {pick.result === 'pending' && <span className="text-text-secondary text-sm">Pending</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}

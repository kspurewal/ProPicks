'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/components/UserProvider';
import BadgeDisplay from '@/components/BadgeDisplay';
import SharePickModal from '@/components/SharePickModal';
import { getPicksByUser } from '@/lib/storage';
import { Pick, Sport } from '@/lib/types';

const SPORT_LABELS: Record<Sport, string> = {
  nba: 'NBA',
  mlb: 'MLB',
  nfl: 'NFL',
  nhl: 'NHL',
};

const SPORT_COLORS: Record<Sport, string> = {
  nba: 'text-orange-400',
  mlb: 'text-red-400',
  nfl: 'text-emerald-400',
  nhl: 'text-sky-400',
};

export default function ProfilePage() {
  const { user, username, isLoggedIn, logout, loading: userLoading } = useUser();
  const [allPicks, setAllPicks] = useState<Pick[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [sharepick, setSharePick] = useState<Pick | null>(null);

  useEffect(() => {
    if (!username) {
      setPicksLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchPicks() {
      try {
        const data = await getPicksByUser(username!);
        if (!cancelled) setAllPicks(data);
      } finally {
        if (!cancelled) setPicksLoading(false);
      }
    }

    fetchPicks();
    const interval = setInterval(fetchPicks, 2 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [username]);

  const recentPicks = useMemo(
    () => [...allPicks].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
    [allPicks]
  );

  // Sport accuracy breakdown — only picks that have sport field attached
  const sportStats = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const pick of allPicks) {
      if (!pick.sport || pick.result === 'pending' || pick.result === undefined) continue;
      if (!map[pick.sport]) map[pick.sport] = { correct: 0, total: 0 };
      map[pick.sport].total++;
      if (pick.result === 'correct') map[pick.sport].correct++;
    }
    return map;
  }, [allPicks]);

  // Streak calendar — last 30 days
  const calendarDays = useMemo(() => {
    const picksByDate: Record<string, Pick[]> = {};
    for (const pick of allPicks) {
      if (!picksByDate[pick.date]) picksByDate[pick.date] = [];
      picksByDate[pick.date].push(pick);
    }
    const days: { date: string; status: 'correct' | 'incorrect' | 'mixed' | 'pending' | 'none' }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const picks = picksByDate[dateStr] || [];
      let status: 'correct' | 'incorrect' | 'mixed' | 'pending' | 'none' = 'none';
      if (picks.length > 0) {
        const resolved = picks.filter((p) => p.result !== 'pending');
        const hasPending = picks.some((p) => p.result === 'pending');
        if (resolved.length === 0) {
          status = 'pending';
        } else {
          const allCorrect = resolved.every((p) => p.result === 'correct');
          const allIncorrect = resolved.every((p) => p.result === 'incorrect');
          if (allCorrect && !hasPending) status = 'correct';
          else if (allIncorrect && !hasPending) status = 'incorrect';
          else status = 'mixed';
        }
      }
      days.push({ date: dateStr, status });
    }
    return days;
  }, [allPicks]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">🏀</p>
        <p className="text-lg text-text-secondary">Sign up to see your profile</p>
      </div>
    );
  }

  const accuracy = user && user.totalPicks > 0
    ? Math.round((user.correctPicks / user.totalPicks) * 100)
    : 0;

  const sportBreakdownEntries = Object.entries(sportStats) as [Sport, { correct: number; total: number }][];

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{username}</h1>
        <p className="text-text-secondary text-sm mt-1">
          Member since {user ? new Date(user.createdAt).toLocaleDateString() : ''}
        </p>
        {user?.pin && (
          <div className="inline-flex items-center gap-2 mt-3 bg-bg-card border border-white/10 rounded-lg px-4 py-2">
            <span className="text-xs text-text-secondary">Recovery PIN</span>
            <span className="text-lg font-bold tracking-widest text-accent-green">{user.pin}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Points" value={user?.totalPoints || 0} color="text-accent-green" />
        <StatBox label="Correct Picks" value={user?.correctPicks || 0} color="text-correct" />
        <StatBox label="Accuracy" value={`${accuracy}%`} color="text-text-primary" />
        <StatBox label="Best Streak" value={user?.longestStreak || 0} color="text-streak-fire" />
      </div>

      {user && user.currentStreak > 0 && (
        <div className="bg-bg-card border border-streak-fire/20 rounded-xl p-4 mb-8 text-center">
          <p className="text-streak-fire text-3xl font-bold">{user.currentStreak}</p>
          <p className="text-text-secondary text-sm">Current Winning Streak</p>
        </div>
      )}

      {/* Streak Calendar */}
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
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <LegendDot color="bg-correct" label="All correct" />
            <LegendDot color="bg-incorrect" label="All missed" />
            <LegendDot color="bg-amber-400" label="Mixed" />
            <LegendDot color="bg-white/20" label="Pending" />
            <LegendDot color="bg-white/5" label="No picks" />
          </div>
        </div>
      </div>

      {/* Accuracy by Sport */}
      {sportBreakdownEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3">Accuracy by Sport</h2>
          <div className="bg-bg-card border border-white/5 rounded-xl p-4 space-y-3">
            {sportBreakdownEntries
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([sport, { correct, total }]) => {
                const pct = Math.round((correct / total) * 100);
                return (
                  <div key={sport}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${SPORT_COLORS[sport]}`}>
                        {SPORT_LABELS[sport]}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {correct}/{total} &mdash; <span className="text-text-primary font-semibold">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-accent-green rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-4">Badges</h2>
        <BadgeDisplay badges={user?.badges || []} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Picks</h2>
        {picksLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-bg-card rounded-lg h-10 animate-pulse" />
            ))}
          </div>
        ) : recentPicks.length === 0 ? (
          <p className="text-text-secondary text-sm">No picks yet. Head to Today&apos;s Picks to get started!</p>
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
                  {pick.result === 'correct' && (
                    <span className="text-correct text-sm font-semibold">+{pick.pointsEarned}</span>
                  )}
                  {pick.result === 'incorrect' && (
                    <span className="text-incorrect text-sm">MISS</span>
                  )}
                  {pick.result === 'pending' && (
                    <span className="text-text-secondary text-sm">Pending</span>
                  )}
                  <button
                    onClick={() => setSharePick(pick)}
                    className="text-text-secondary hover:text-accent-green transition"
                    title="Share pick"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={logout}
          className="text-sm text-red-400 hover:text-red-300 transition"
        >
          Log Out
        </button>
      </div>

      {sharepick && username && (
        <SharePickModal pick={sharepick} username={username} onClose={() => setSharePick(null)} />
      )}
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

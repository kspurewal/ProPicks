'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/components/UserProvider';
import { Pick, Sport } from '@/lib/types';

const SPORT_LABELS: Record<Sport, string> = { nba: 'NBA', mlb: 'MLB', nfl: 'NFL', nhl: 'NHL' };
const SPORT_COLORS: Record<Sport, string> = {
  nba: 'text-orange-400',
  mlb: 'text-red-400',
  nfl: 'text-emerald-400',
  nhl: 'text-sky-400',
};

const PAGE_SIZE = 25;

type ResultFilter = 'all' | 'correct' | 'incorrect' | 'pending';
type SportFilter = 'all' | Sport;

export default function HistoryPage() {
  const { username, isLoggedIn, loading: userLoading } = useUser();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/picks?username=${username}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPicks(data.picks.sort((a: Pick, b: Pick) => b.timestamp - a.timestamp));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [username]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [resultFilter, sportFilter]);

  const filtered = useMemo(() => {
    return picks.filter((p) => {
      if (resultFilter !== 'all' && p.result !== resultFilter) return false;
      if (sportFilter !== 'all' && p.sport !== sportFilter) return false;
      return true;
    });
  }, [picks, resultFilter, sportFilter]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const summary = useMemo(() => {
    const resolved = picks.filter((p) => p.result === 'correct' || p.result === 'incorrect');
    const correct = resolved.filter((p) => p.result === 'correct').length;
    const totalPoints = picks.reduce((s, p) => s + (p.pointsEarned || 0), 0);
    return { correct, total: resolved.length, totalPoints };
  }, [picks]);

  if (userLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isLoggedIn) return (
    <div className="text-center py-20">
      <p className="text-lg text-text-secondary">Sign up to see your pick history</p>
    </div>
  );

  const accuracy = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Pick History</h1>
        <p className="text-text-secondary text-sm mt-1">All your picks, all time</p>
      </div>

      {/* Summary row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-bg-card border border-white/5 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-accent-green">{summary.totalPoints}</p>
            <p className="text-xs text-text-secondary mt-0.5">Total Points</p>
          </div>
          <div className="bg-bg-card border border-white/5 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{summary.correct}/{summary.total}</p>
            <p className="text-xs text-text-secondary mt-0.5">Correct</p>
          </div>
          <div className="bg-bg-card border border-white/5 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{accuracy}%</p>
            <p className="text-xs text-text-secondary mt-0.5">Accuracy</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'correct', 'incorrect', 'pending'] as ResultFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => setResultFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              resultFilter === r
                ? r === 'correct' ? 'bg-correct/20 text-correct border border-correct/30'
                  : r === 'incorrect' ? 'bg-incorrect/20 text-incorrect border border-incorrect/30'
                  : 'bg-white/10 text-text-primary border border-white/20'
                : 'bg-white/5 text-text-secondary border border-white/5 hover:bg-white/10'
            }`}
          >
            {r === 'all' ? 'All Results' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSportFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            sportFilter === 'all' ? 'bg-white/10 text-text-primary border border-white/20' : 'bg-white/5 text-text-secondary border border-white/5 hover:bg-white/10'
          }`}
        >
          All Sports
        </button>
        {(['nba', 'mlb', 'nfl', 'nhl'] as Sport[]).map((s) => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              sportFilter === s ? `bg-white/10 ${SPORT_COLORS[s]} border border-white/20` : 'bg-white/5 text-text-secondary border border-white/5 hover:bg-white/10'
            }`}
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-bg-card rounded-lg h-12 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <p>No picks match these filters</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-text-secondary mb-2">
            Showing {Math.min(paginated.length, filtered.length)} of {filtered.length} picks
          </div>
          <div className="space-y-2">
            {paginated.map((pick) => (
              <div
                key={pick.id}
                className={`bg-bg-card border rounded-lg px-4 py-3 flex items-center justify-between ${
                  pick.result === 'correct' ? 'border-correct/20' :
                  pick.result === 'incorrect' ? 'border-incorrect/20' :
                  'border-white/5'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-medium">{pick.date}</span>
                    {pick.sport && (
                      <span className={`text-xs font-bold ${SPORT_COLORS[pick.sport]}`}>
                        {SPORT_LABELS[pick.sport]}
                      </span>
                    )}
                    <span className="text-text-secondary text-xs truncate">Game {pick.gameId}</span>
                  </div>
                  {pick.confidence && (
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={`text-xs ${n <= pick.confidence! ? 'text-accent-gold' : 'text-white/10'}`}>★</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {pick.result === 'correct' && (
                    <span className="text-correct text-sm font-semibold">+{pick.pointsEarned}</span>
                  )}
                  {pick.result === 'incorrect' && (
                    <span className="text-incorrect text-sm font-medium">MISS</span>
                  )}
                  {pick.result === 'pending' && (
                    <span className="text-text-secondary text-sm">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full mt-4 py-2.5 rounded-lg border border-white/10 text-text-secondary text-sm hover:bg-white/5 transition"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}

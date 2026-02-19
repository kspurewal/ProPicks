'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/components/UserProvider';
import LeaderboardTable from '@/components/LeaderboardTable';
import { LeaderboardEntry } from '@/lib/types';

export default function LeaderboardPage() {
  const { username } = useUser();
  const [type, setType] = useState<'weekly' | 'alltime'>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [myRank, setMyRank] = useState<{ rank: number; entry: LeaderboardEntry } | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type });
        if (username) params.set('username', username);
        const res = await fetch(`/api/leaderboard?${params}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries);
          setMyRank(data.myRank || null);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [type, username]);

  const filteredEntries = search.trim()
    ? entries.filter((e) => e.username.toLowerCase().includes(search.toLowerCase().trim()))
    : entries;

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Leaderboard</h1>
        <p className="text-text-secondary text-sm mt-1">See who&apos;s on top</p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setType('alltime')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            type === 'alltime' ? 'bg-white/10 text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setType('weekly')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            type === 'weekly' ? 'bg-white/10 text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          This Week
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for players"
          className="w-full bg-bg-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-green/50 transition"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-bg-card rounded-lg h-12 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-bg-card border border-white/5 rounded-xl overflow-hidden">
            <LeaderboardTable entries={filteredEntries} type={type} currentUser={username} />
          </div>

          {myRank && !search.trim() && (
            <div className="mt-4 bg-accent-green/5 border border-accent-green/20 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs text-text-secondary text-center">Your Rank</p>
              </div>
              <LeaderboardTable entries={[myRank.entry]} type={type} currentUser={username} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

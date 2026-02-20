'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LeaderboardEntry } from '@/lib/types';

interface Props {
  entries: LeaderboardEntry[];
  type: 'weekly' | 'alltime';
  currentUser?: string | null;
}

function LeaderboardRow({
  entry,
  type,
  isMe,
}: {
  entry: LeaderboardEntry;
  type: 'weekly' | 'alltime';
  isMe: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  let rankDisplay: React.ReactNode = entry.rank;
  if (entry.rank === 1) rankDisplay = <span className="text-accent-gold">1</span>;
  else if (entry.rank === 2) rankDisplay = <span className="text-gray-400">2</span>;
  else if (entry.rank === 3) rankDisplay = <span className="text-amber-700">3</span>;

  const stats = [
    { label: 'All-Time Pts', value: entry.totalPoints },
    { label: 'Weekly Pts', value: entry.weeklyPoints },
    { label: 'Streak', value: entry.currentStreak },
    { label: 'Accuracy', value: `${entry.accuracy}%` },
  ];

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className={`border-b border-white/5 cursor-pointer transition ${
          isMe ? 'bg-accent-green/5' : 'hover:bg-white/[0.04]'
        }`}
      >
        <td className="py-3 px-3 font-bold text-sm">{rankDisplay}</td>
        <td className="py-3 px-3">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/view?username=${entry.username}`}
              onClick={(e) => e.stopPropagation()}
              className={`font-medium text-sm hover:underline ${isMe ? 'text-accent-green' : 'text-text-primary'}`}
            >
              {entry.username}
            </Link>
            <span className="text-text-secondary text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </td>
        <td className="py-3 px-3 text-right font-semibold text-sm text-text-primary">
          {type === 'weekly' ? entry.weeklyPoints : entry.totalPoints}
        </td>
        <td className="py-3 px-3 text-right hidden sm:table-cell">
          {entry.currentStreak > 0 ? (
            <span className="text-streak-fire text-sm font-semibold">{entry.currentStreak}</span>
          ) : (
            <span className="text-text-secondary text-sm">0</span>
          )}
        </td>
        <td className="py-3 px-3 text-right hidden sm:table-cell text-sm text-text-secondary">
          {entry.accuracy}%
        </td>
      </tr>

      {expanded && (
        <tr className={`border-b border-white/5 ${isMe ? 'bg-accent-green/5' : 'bg-white/[0.02]'}`}>
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-4 gap-3">
              {stats.map(({ label, value }) => (
                <div key={label} className="text-center bg-white/5 rounded-lg py-2 px-3">
                  <p className="text-sm font-bold text-text-primary">{value}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LeaderboardTable({ entries, type, currentUser }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p className="text-lg">No players yet</p>
        <p className="text-sm mt-1">Be the first to make a pick!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-text-secondary text-xs uppercase border-b border-white/10">
            <th className="text-left py-3 px-3 w-12">#</th>
            <th className="text-left py-3 px-3">Player</th>
            <th className="text-right py-3 px-3">Points</th>
            <th className="text-right py-3 px-3 hidden sm:table-cell">Streak</th>
            <th className="text-right py-3 px-3 hidden sm:table-cell">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.username}
              entry={entry}
              type={type}
              isMe={entry.username === currentUser}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

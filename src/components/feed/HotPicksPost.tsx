'use client';

import { FeedPost, HotPicksData } from '@/lib/types';
import Image from 'next/image';

const SPORT_COLORS: Record<string, string> = {
  nba: 'text-orange-400',
  nfl: 'text-emerald-400',
  mlb: 'text-red-400',
  nhl: 'text-sky-400',
};

export default function HotPicksPost({ post }: { post: FeedPost }) {
  const data = post.data as HotPicksData;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">{data.headline}</p>

      <div className="space-y-2">
        {data.picks.map((entry) => {
          const sportColor = SPORT_COLORS[entry.sport] || 'text-text-secondary';
          return (
            <div
              key={`${entry.username}-${entry.gameId}`}
              className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
            >
              {/* Picked team logo */}
              <Image
                src={entry.pickedTeamLogo}
                alt={entry.pickedTeamAbbreviation}
                width={28}
                height={28}
                className="rounded flex-shrink-0"
              />

              {/* Pick info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">
                  <span className="text-white/60 font-normal">@</span>
                  {entry.username}
                  <span className="text-white/40 font-normal mx-1">→</span>
                  <span>{entry.pickedTeamAbbreviation}</span>
                  <span className="text-white/40 font-normal"> vs {entry.opponentAbbreviation}</span>
                </p>
                <p className={`text-xs ${sportColor} font-semibold uppercase`}>
                  {entry.sport}
                </p>
              </div>

              {/* Opponent logo (faded) */}
              <Image
                src={entry.opponentLogo}
                alt={entry.opponentAbbreviation}
                width={20}
                height={20}
                className="rounded opacity-30 flex-shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

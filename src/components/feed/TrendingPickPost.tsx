'use client';

import { FeedPost, TrendingPickData } from '@/lib/types';
import Image from 'next/image';

export default function TrendingPickPost({ post }: { post: FeedPost }) {
  const data = post.data as TrendingPickData;
  const pct = data.totalPicksForGame > 0
    ? Math.round((data.pickCount / data.totalPicksForGame) * 100)
    : 100;

  return (
    <div className="space-y-2">
      {/* Teams row */}
      <div className="flex items-center gap-3">
        <Image
          src={data.teamLogo}
          alt={data.teamAbbreviation}
          width={36}
          height={36}
          className="rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary">
            {data.teamName}
            <span className="text-text-secondary font-normal"> vs {data.opponentAbbreviation}</span>
          </p>
          <p className="text-xs text-text-secondary">
            {data.pickCount} picks ({pct}% of game picks)
          </p>
        </div>
        <Image
          src={data.opponentLogo}
          alt={data.opponentAbbreviation}
          width={28}
          height={28}
          className="rounded opacity-40 flex-shrink-0"
        />
      </div>

      {/* Pick split bar */}
      <div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-green rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span className="text-accent-green font-semibold">{data.teamAbbreviation} {pct}%</span>
          <span>{data.opponentAbbreviation} {100 - pct}%</span>
        </div>
      </div>
    </div>
  );
}

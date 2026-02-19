'use client';

import { FeedPost, PlayerPerformanceData } from '@/lib/types';
import Image from 'next/image';

export default function PlayerPerformancePost({ post }: { post: FeedPost }) {
  const data = post.data as PlayerPerformanceData;
  const resultColor = data.isWin ? 'text-accent-green' : 'text-red-400';
  const resultLabel = data.isWin ? 'W' : 'L';

  return (
    <div className="flex items-center gap-3">
      {/* Player headshot */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        <Image
          src={data.playerImageUrl}
          alt={data.playerName}
          fill
          className="object-cover object-top"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-text-primary truncate">{data.playerName}</p>
          <span className={`text-xs font-bold flex-shrink-0 ${resultColor}`}>
            {resultLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Image
            src={data.teamLogo}
            alt={data.teamAbbreviation}
            width={14}
            height={14}
            className="rounded"
          />
          <p className="text-xs text-text-secondary">
            {data.teamAbbreviation} vs {data.opponentAbbreviation}
          </p>
        </div>
        <p className="text-xs font-semibold text-blue-400 mt-1 tracking-wide">
          {data.headline}
        </p>
      </div>
    </div>
  );
}

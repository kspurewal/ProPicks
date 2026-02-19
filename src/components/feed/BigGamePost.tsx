'use client';

import { FeedPost, BigGameData } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import Image from 'next/image';

export default function BigGamePost({ post }: { post: FeedPost }) {
  const data = post.data as BigGameData;
  const isLive = data.status === 'in_progress';
  const isFinal = data.status === 'final';

  return (
    <div className="space-y-2">
      {/* Headline */}
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
        {data.headline}
      </p>

      {/* Matchup row */}
      <div className="flex items-center gap-3">
        {/* Away */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Image
            src={data.awayTeam.logo}
            alt={data.awayTeam.abbreviation}
            width={32}
            height={32}
            className="rounded flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">{data.awayTeam.abbreviation}</p>
            <p className="text-xs text-text-secondary">{data.awayTeam.record}</p>
          </div>
        </div>

        {/* Score / status */}
        <div className="text-center flex-shrink-0 px-2">
          {isFinal || isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-text-primary">{data.awayScore}</span>
              <span className="text-xs text-text-secondary">–</span>
              <span className="text-base font-bold text-text-primary">{data.homeScore}</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-text-secondary">VS</span>
          )}
          {isLive && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-bold">LIVE</span>
            </div>
          )}
          {isFinal && (
            <p className="text-xs text-text-secondary mt-0.5">FINAL</p>
          )}
          {!isFinal && !isLive && (
            <p className="text-xs text-text-secondary mt-0.5">{formatTime(data.startTime)}</p>
          )}
        </div>

        {/* Home */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-text-primary">{data.homeTeam.abbreviation}</p>
            <p className="text-xs text-text-secondary">{data.homeTeam.record}</p>
          </div>
          <Image
            src={data.homeTeam.logo}
            alt={data.homeTeam.abbreviation}
            width={32}
            height={32}
            className="rounded flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

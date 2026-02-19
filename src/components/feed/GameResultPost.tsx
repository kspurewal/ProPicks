'use client';

import { FeedPost, GameResultData } from '@/lib/types';
import Image from 'next/image';

export default function GameResultPost({ post }: { post: FeedPost }) {
  const data = post.data as GameResultData;
  const homeWon = data.homeScore > data.awayScore;

  return (
    <div className="space-y-3">
      {/* Score line */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${!homeWon ? 'opacity-50' : ''}`}>
          <Image src={data.awayTeam.logo} alt={data.awayTeam.abbreviation} width={28} height={28} unoptimized />
          <span className="font-bold text-text-primary">{data.awayTeam.abbreviation}</span>
          <span className={`text-xl font-extrabold ${!homeWon ? 'text-text-primary' : 'text-accent-green'}`}>
            {data.awayScore}
          </span>
        </div>
        <span className="text-text-secondary text-xs font-bold">FINAL</span>
        <div className={`flex items-center gap-2 ${homeWon ? '' : 'opacity-50'}`}>
          <span className={`text-xl font-extrabold ${homeWon ? 'text-accent-green' : 'text-text-primary'}`}>
            {data.homeScore}
          </span>
          <span className="font-bold text-text-primary">{data.homeTeam.abbreviation}</span>
          <Image src={data.homeTeam.logo} alt={data.homeTeam.abbreviation} width={28} height={28} unoptimized />
        </div>
      </div>

      {/* Who picked correctly */}
      {data.correctPickers.length > 0 ? (
        <div>
          <p className="text-xs text-text-secondary mb-1.5">
            Got it right ({data.correctPickers.length}/{data.totalPickers}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.correctPickers.map((e) => (
              <span
                key={e.username}
                className="text-xs bg-correct/10 text-correct border border-correct/20 rounded-full px-2 py-0.5 font-semibold"
              >
                @{e.username}
              </span>
            ))}
          </div>
        </div>
      ) : data.totalPickers > 0 ? (
        <p className="text-xs text-text-secondary">
          {data.totalPickers} {data.totalPickers === 1 ? 'pick' : 'picks'} — nobody called it
        </p>
      ) : null}
    </div>
  );
}

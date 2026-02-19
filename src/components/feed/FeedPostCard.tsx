'use client';

import { FeedPost } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import TrendingPickPost from './TrendingPickPost';
import BigGamePost from './BigGamePost';
import PlayerPerformancePost from './PlayerPerformancePost';
import NewsPost from './NewsPost';
import HotPicksPost from './HotPicksPost';
import GameResultPost from './GameResultPost';

const TYPE_CONFIG: Record<
  FeedPost['type'],
  { label: string; accentClass: string; labelClass: string }
> = {
  trending_pick: {
    label: 'TRENDING',
    accentClass: 'bg-accent-green',
    labelClass: 'text-accent-green',
  },
  big_game: {
    label: 'MATCHUP',
    accentClass: 'bg-amber-400',
    labelClass: 'text-amber-400',
  },
  player_performance: {
    label: 'STANDOUT',
    accentClass: 'bg-blue-400',
    labelClass: 'text-blue-400',
  },
  news: {
    label: 'NEWS',
    accentClass: 'bg-text-secondary',
    labelClass: 'text-text-secondary',
  },
  hot_picks: {
    label: 'HOT PICKS',
    accentClass: 'bg-rose-500',
    labelClass: 'text-rose-400',
  },
  game_result: {
    label: 'RESULT',
    accentClass: 'bg-correct',
    labelClass: 'text-correct',
  },
};

const SPORT_COLORS: Record<string, string> = {
  nba: 'text-orange-400',
  nfl: 'text-emerald-400',
  mlb: 'text-red-400',
  nhl: 'text-sky-400',
};

export default function FeedPostCard({ post }: { post: FeedPost }) {
  const config = TYPE_CONFIG[post.type];
  const sportColor = SPORT_COLORS[post.sport] || 'text-text-secondary';

  return (
    <div className="bg-bg-card border border-white/5 rounded-xl overflow-hidden flex">
      {/* Sleeper-style left accent bar */}
      <div className={`w-1 flex-shrink-0 ${config.accentClass}`} />

      <div className="flex-1 min-w-0 p-4">
        {/* Compact top metadata row */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold uppercase tracking-wide ${config.labelClass}`}>
            {config.label}
          </span>
          <span className="text-white/20">·</span>
          <span className={`text-xs font-bold uppercase ${sportColor}`}>
            {post.sport.toUpperCase()}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-xs text-text-secondary">{timeAgo(post.timestamp)}</span>
        </div>

        {/* Post body */}
        {post.type === 'trending_pick' && <TrendingPickPost post={post} />}
        {post.type === 'big_game' && <BigGamePost post={post} />}
        {post.type === 'player_performance' && <PlayerPerformancePost post={post} />}
        {post.type === 'news' && <NewsPost post={post} />}
        {post.type === 'hot_picks' && <HotPicksPost post={post} />}
        {post.type === 'game_result' && <GameResultPost post={post} />}
      </div>
    </div>
  );
}

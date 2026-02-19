'use client';

import { Badge } from '@/lib/types';

const BADGE_ICONS: Record<string, string> = {
  first_blood: '🎯',
  perfect_night: '✨',
  upset_king: '👑',
  hot_streak_5: '🔥',
  hot_streak_10: '💥',
  iron_picker: '🛡️',
  sharpshooter: '🎯',
  century_club: '💯',
};

interface Props {
  badges: Badge[];
}

export default function BadgeDisplay({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <p className="text-text-secondary text-sm">No badges earned yet. Keep picking!</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="bg-bg-card border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 group relative"
        >
          <span className="text-2xl">{BADGE_ICONS[badge.id] || '🏆'}</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{badge.name}</p>
            <p className="text-xs text-text-secondary">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

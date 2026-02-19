import { User, Pick, Game, Badge, BadgeId } from './types';
import { isPerfectNight } from './scoring';

interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
}

const BADGE_DEFS: BadgeDefinition[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Got your first correct pick' },
  { id: 'perfect_night', name: 'Perfect Night', description: 'Got every pick right in a single day (min 3)' },
  { id: 'upset_king', name: 'Upset King', description: 'Correctly picked 5+ upsets' },
  { id: 'hot_streak_5', name: 'Hot Streak', description: 'Got 5 correct picks in a row' },
  { id: 'hot_streak_10', name: 'On Fire', description: 'Got 10 correct picks in a row' },
  { id: 'iron_picker', name: 'Iron Picker', description: 'Picked at least 1 game every day for 7 straight days' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: '70%+ accuracy over 50+ picks' },
  { id: 'century_club', name: 'Century Club', description: '100+ correct picks' },
];

function hasBadge(user: User, id: BadgeId): boolean {
  return user.badges.some((b) => b.id === id);
}

function makeBadge(id: BadgeId): Badge {
  const def = BADGE_DEFS.find((d) => d.id === id)!;
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    earnedAt: Date.now(),
  };
}

export function evaluateBadges(
  user: User,
  todayPicks: Pick[],
  todayGames: Game[],
  allPicks: Pick[]
): Badge[] {
  const newBadges: Badge[] = [];

  if (!hasBadge(user, 'first_blood') && user.correctPicks >= 1) {
    newBadges.push(makeBadge('first_blood'));
  }

  if (!hasBadge(user, 'perfect_night') && isPerfectNight(todayPicks, todayGames)) {
    newBadges.push(makeBadge('perfect_night'));
  }

  const upsetCorrects = allPicks.filter((p) => {
    if (p.result !== 'correct') return false;
    return p.pointsEarned && p.pointsEarned > 10;
  }).length;
  if (!hasBadge(user, 'upset_king') && upsetCorrects >= 5) {
    newBadges.push(makeBadge('upset_king'));
  }

  if (!hasBadge(user, 'hot_streak_5') && user.currentStreak >= 5) {
    newBadges.push(makeBadge('hot_streak_5'));
  }

  if (!hasBadge(user, 'hot_streak_10') && user.currentStreak >= 10) {
    newBadges.push(makeBadge('hot_streak_10'));
  }

  if (!hasBadge(user, 'iron_picker')) {
    const dates = [...new Set(allPicks.map((p) => p.date))].sort();
    let consecutive = 1;
    let maxConsecutive = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T12:00:00');
      const curr = new Date(dates[i] + 'T12:00:00');
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      if (diffDays === 1) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else {
        consecutive = 1;
      }
    }
    if (maxConsecutive >= 7) {
      newBadges.push(makeBadge('iron_picker'));
    }
  }

  if (!hasBadge(user, 'sharpshooter') && user.totalPicks >= 50) {
    const accuracy = user.correctPicks / user.totalPicks;
    if (accuracy >= 0.7) {
      newBadges.push(makeBadge('sharpshooter'));
    }
  }

  if (!hasBadge(user, 'century_club') && user.correctPicks >= 100) {
    newBadges.push(makeBadge('century_club'));
  }

  return newBadges;
}

export function getBadgeDefinitions(): BadgeDefinition[] {
  return BADGE_DEFS;
}

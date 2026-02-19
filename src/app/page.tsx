'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/components/UserProvider';
import { useGames } from '@/hooks/useGames';
import { usePicks } from '@/hooks/usePicks';
import GameCard from '@/components/GameCard';
import DatePicker from '@/components/DatePicker';
import UsernameModal from '@/components/UsernameModal';
import { todayString } from '@/lib/utils';
import { Sport } from '@/lib/types';

const SPORT_SECTIONS: { key: Sport; label: string }[] = [
  { key: 'nba', label: 'NBA' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nfl', label: 'NFL' },
  { key: 'nhl', label: 'NHL' },
];

export default function HomePage() {
  const [date, setDate] = useState(todayString());
  const { username, user, isLoggedIn, login, savePreferences, loading: userLoading } = useUser();
  const { games, loading: gamesLoading } = useGames(date);
  const { submitPick, getPickForGame } = usePicks(username, date);
  const [showSignup, setShowSignup] = useState(false);
  const [activeSport, setActiveSport] = useState<Sport>('nba');

  // Set the active sport to the user's first followed league if they have preferences
  useEffect(() => {
    if (user?.followedLeagues && user.followedLeagues.length > 0) {
      setActiveSport(user.followedLeagues[0]);
    }
  }, [user?.followedLeagues]);

  // Determine which sport tabs to show — if user follows leagues, show those first
  const sportTabs = useMemo(() => {
    if (user?.followedLeagues && user.followedLeagues.length > 0) {
      const followed = SPORT_SECTIONS.filter((s) => user.followedLeagues.includes(s.key));
      const rest = SPORT_SECTIONS.filter((s) => !user.followedLeagues.includes(s.key));
      return [...followed, ...rest];
    }
    return SPORT_SECTIONS;
  }, [user?.followedLeagues]);

  const filteredGames = useMemo(() => {
    let filtered = games.filter((g) => g.sport === activeSport);

    // If user follows specific teams in this sport, show those games first
    if (user?.followedTeams && user.followedTeams.length > 0) {
      const followedSet = new Set(user.followedTeams);
      filtered.sort((a, b) => {
        const aFollowed = followedSet.has(a.homeTeam.id) || followedSet.has(a.awayTeam.id);
        const bFollowed = followedSet.has(b.homeTeam.id) || followedSet.has(b.awayTeam.id);
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        return 0;
      });
    }

    return filtered;
  }, [games, activeSport, user?.followedTeams]);

  async function handlePick(gameId: string, teamId: string) {
    if (!isLoggedIn) {
      setShowSignup(true);
      return;
    }
    try {
      await submitPick(gameId, teamId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit pick');
    }
  }

  const today = todayString();
  const isToday = date === today;

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {isToday ? "Today's Games" : 'Games'}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {isToday ? 'Pick the winners before game time!' : 'View games and results'}
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {sportTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSport(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSport === key
                ? 'bg-accent-green text-white'
                : 'bg-bg-card border border-white/10 text-text-secondary hover:bg-bg-card-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DatePicker date={date} onChange={setDate} />

      {gamesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="text-lg text-text-secondary">No {activeSport.toUpperCase()} games scheduled for this day</p>
          <p className="text-sm text-text-secondary mt-1">Try another date!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              pick={getPickForGame(game.id)}
              onPick={(teamId) => handlePick(game.id, teamId)}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}

      {!isLoggedIn && !userLoading && games.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-text-secondary text-sm mb-3">Sign up to start making picks!</p>
          <button
            onClick={() => setShowSignup(true)}
            className="bg-accent-green hover:bg-accent-green-hover text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            Get Started
          </button>
        </div>
      )}

      {showSignup && (
        <UsernameModal
          onSubmit={async (name) => {
            await login(name);
          }}
          onClose={() => setShowSignup(false)}
          onPreferences={async (leagues, teams) => {
            await savePreferences(leagues, teams);
            setShowSignup(false);
          }}
        />
      )}
    </div>
  );
}

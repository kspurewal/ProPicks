'use client';

import { useState, useEffect } from 'react';
import { Sport } from '@/lib/types';
import { getInappropriateReason } from '@/lib/profanity';
import { fetchTeams } from '@/lib/espn';

interface TeamOption {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  sport: Sport;
}

const LEAGUES: { key: Sport; label: string; icon: string }[] = [
  { key: 'nba', label: 'NBA', icon: '🏀' },
  { key: 'nfl', label: 'NFL', icon: '🏈' },
  { key: 'mlb', label: 'MLB', icon: '⚾' },
  { key: 'nhl', label: 'NHL', icon: '🏒' },
];

interface Props {
  onSubmit: (username: string) => Promise<void>;
  onClose: () => void;
  onPreferences?: (leagues: Sport[], teams: string[]) => Promise<void>;
}

export default function UsernameModal({ onSubmit, onClose, onPreferences }: Props) {
  const [step, setStep] = useState<'username' | 'leagues' | 'teams'>('username');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Preferences
  const [selectedLeagues, setSelectedLeagues] = useState<Sport[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  // Fetch teams when we enter the teams step
  useEffect(() => {
    if (step === 'teams' && allTeams.length === 0) {
      setTeamsLoading(true);
      const leagues: Sport[] = ['nba', 'nfl', 'mlb', 'nhl'];
      Promise.all(leagues.map((s) => fetchTeams(s)))
        .then((results) => setAllTeams(results.flat()))
        .catch(() => {})
        .finally(() => setTeamsLoading(false));
    }
  }, [step, allTeams.length]);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    const inappropriate = getInappropriateReason(trimmed);
    if (inappropriate) {
      setError(inappropriate);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      // Move to league selection
      setStep('leagues');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleLeague(league: Sport) {
    setSelectedLeagues((prev) =>
      prev.includes(league) ? prev.filter((l) => l !== league) : [...prev, league]
    );
  }

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((t) => t !== teamId) : [...prev, teamId]
    );
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      if (onPreferences) {
        await onPreferences(selectedLeagues, selectedTeams);
      }
      onClose();
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTeams = allTeams
    .filter((t) => selectedLeagues.includes(t.sport))
    .filter(
      (t) =>
        !teamSearch ||
        t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase())
    );

  // Group teams by sport
  const teamsByLeague = selectedLeagues.map((league) => ({
    league,
    label: LEAGUES.find((l) => l.key === league)?.label || league.toUpperCase(),
    teams: filteredTeams.filter((t) => t.sport === league),
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['username', 'leagues', 'teams'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s
                    ? 'bg-accent-green text-white'
                    : ['username', 'leagues', 'teams'].indexOf(step) > i
                    ? 'bg-accent-green/30 text-accent-green'
                    : 'bg-white/10 text-text-secondary'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 ${
                    ['username', 'leagues', 'teams'].indexOf(step) > i
                      ? 'bg-accent-green/30'
                      : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Username */}
        {step === 'username' && (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🏀</div>
              <h2 className="text-2xl font-bold text-text-primary">Welcome to ProPicks</h2>
              <p className="text-text-secondary text-sm mt-2">
                Pick winners. Earn points. Climb the leaderboard.
              </p>
            </div>

            <form onSubmit={handleUsernameSubmit}>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Choose your username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. hoops_guru"
                className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-green transition"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                required
                autoFocus
              />
              <p className="text-xs text-text-secondary mt-1">
                3-20 characters, letters, numbers, underscores
              </p>

              {error && <p className="text-incorrect text-sm mt-2">{error}</p>}

              <button
                type="submit"
                disabled={submitting || name.trim().length < 3}
                className="w-full mt-4 bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
              >
                {submitting ? 'Joining...' : 'Next'}
              </button>
            </form>

            <button
              onClick={onClose}
              className="w-full mt-3 text-text-secondary text-sm hover:text-text-primary transition"
            >
              Maybe later
            </button>
          </>
        )}

        {/* STEP 2: League Selection */}
        {step === 'leagues' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Follow Leagues</h2>
              <p className="text-text-secondary text-sm mt-2">
                Which leagues do you follow? Your feed will be personalized based on this.
              </p>
              <p className="text-xs text-text-secondary/60 mt-1">Don&apos;t worry — you can change this any time from the feed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {LEAGUES.map(({ key, label, icon }) => {
                const isSelected = selectedLeagues.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleLeague(key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-accent-green bg-accent-green/10 text-text-primary'
                        : 'border-white/10 bg-bg-primary text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <span className="text-3xl">{icon}</span>
                    <span className="font-semibold text-lg">{label}</span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (selectedLeagues.length > 0) {
                  setStep('teams');
                }
              }}
              disabled={selectedLeagues.length === 0}
              className="w-full bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
            >
              Next — Pick Your Teams
            </button>
            <button
              onClick={handleFinish}
              className="w-full mt-3 text-text-secondary text-sm hover:text-text-primary transition"
            >
              Skip for now
            </button>
          </>
        )}

        {/* STEP 3: Team Selection */}
        {step === 'teams' && (
          <>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-text-primary">Follow Teams</h2>
              <p className="text-text-secondary text-sm mt-2">
                Pick the teams you want to follow. Your feed and picks page will prioritize these.
              </p>
              <p className="text-xs text-text-secondary/60 mt-1">Don&apos;t worry — you can follow or unfollow teams any time from the feed.</p>
            </div>

            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full px-4 py-2 mb-4 bg-bg-primary border border-white/10 rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-green transition text-sm"
            />

            {teamsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-bg-primary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {teamsByLeague.map(({ league, label, teams }) => (
                  <div key={league}>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2 sticky top-0 bg-bg-card py-1">
                      {label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {teams.map((team) => {
                        const isSelected = selectedTeams.includes(team.id);
                        return (
                          <button
                            key={team.id}
                            onClick={() => toggleTeam(team.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                              isSelected
                                ? 'border-accent-green bg-accent-green/10'
                                : 'border-white/5 bg-bg-primary hover:border-white/15'
                            }`}
                          >
                            {team.logo && (
                              <img
                                src={team.logo}
                                alt={team.abbreviation}
                                className="w-7 h-7 object-contain"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs font-medium truncate ${
                                  isSelected ? 'text-text-primary' : 'text-text-secondary'
                                }`}
                              >
                                {team.name}
                              </p>
                            </div>
                            {isSelected && (
                              <svg
                                className="w-4 h-4 text-accent-green flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTeams.length > 0 && (
              <p className="text-xs text-text-secondary mt-3 text-center">
                {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
              </p>
            )}

            <button
              onClick={handleFinish}
              disabled={submitting}
              className="w-full mt-4 bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {submitting ? 'Saving...' : "Let's Go!"}
            </button>
            <button
              onClick={() => setStep('leagues')}
              className="w-full mt-3 text-text-secondary text-sm hover:text-text-primary transition"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

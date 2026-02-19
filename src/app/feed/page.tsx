'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FeedPost, BigGameData, TrendingPickData, PlayerPerformanceData, NewsData, Team, Sport } from '@/lib/types';
import FeedPostCard from '@/components/feed/FeedPostCard';
import Image from 'next/image';
import { useUser } from '@/components/UserProvider';

const DAYS_PER_PAGE = 5;

type LeagueTab = 'all' | Sport;

const LEAGUE_TABS: { id: LeagueTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'nba', label: 'NBA' },
  { id: 'nfl', label: 'NFL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
];

const LEAGUE_ACTIVE_BG: Record<Sport, string> = {
  nba: 'bg-orange-400 text-black',
  nfl: 'bg-emerald-400 text-black',
  mlb: 'bg-red-400 text-black',
  nhl: 'bg-sky-400 text-black',
};

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeLeague, setActiveLeague] = useState<LeagueTab>('all');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Per-league selected team (view filter only, not follow)
  const [leagueTeamPicker, setLeagueTeamPicker] = useState<Partial<Record<Sport, string>>>({});
  // All teams loaded from API, keyed by sport
  const [teamsBySport, setTeamsBySport] = useState<Partial<Record<Sport, Team[]>>>({});
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);

  const daysOffsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { user, savePreferences } = useUser();

  const followedTeamIds = new Set(user?.followedTeams || []);
  const followedLeagueIds = new Set(user?.followedLeagues || []);

  // Load all teams once
  useEffect(() => {
    setTeamsLoading(true);
    fetch('/api/teams')
      .then((r) => r.json())
      .then((data: { teams: (Team & { sport: Sport })[] }) => {
        const grouped: Partial<Record<Sport, Team[]>> = {};
        for (const team of data.teams) {
          if (!grouped[team.sport]) grouped[team.sport] = [];
          grouped[team.sport]!.push(team);
        }
        // Sort each sport's teams by name
        for (const sport of Object.keys(grouped) as Sport[]) {
          grouped[sport]!.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
        }
        setTeamsBySport(grouped);
      })
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, []);

  // Toggle follow for a team — persists to account, auto-follows the league
  const toggleFollowTeam = useCallback(async (teamId: string, sport: Sport) => {
    if (!user || followSaving) return;
    setFollowSaving(true);
    const currentTeams = user.followedTeams || [];
    const currentLeagues = user.followedLeagues || [];
    const isFollowed = currentTeams.includes(teamId);

    let newTeams: string[];
    let newLeagues: Sport[];

    if (isFollowed) {
      newTeams = currentTeams.filter((id) => id !== teamId);
      const sportTeams = teamsBySport[sport] || [];
      const remainingInSport = newTeams.filter((id) => sportTeams.some((t) => t.id === id));
      newLeagues = remainingInSport.length === 0
        ? currentLeagues.filter((l) => l !== sport)
        : currentLeagues;
    } else {
      newTeams = [...currentTeams, teamId];
      newLeagues = currentLeagues.includes(sport) ? currentLeagues : [...currentLeagues, sport];
    }

    try {
      await savePreferences(newLeagues, newTeams);
    } finally {
      setFollowSaving(false);
    }
  }, [user, followSaving, teamsBySport, savePreferences]);

  const fetchPosts = useCallback(async (daysOffset: number, replace: boolean) => {
    try {
      const res = await fetch(`/api/feed?daysOffset=${daysOffset}`);
      const json = await res.json();
      const newPosts: FeedPost[] = json.posts || [];
      setPosts((prev) => replace ? newPosts : [...prev, ...newPosts]);
      setHasMore(json.hasMore ?? false);
      daysOffsetRef.current = daysOffset + DAYS_PER_PAGE;
    } catch {
      if (replace) setPosts([]);
    } finally {
      if (replace) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  // Initial load + refresh interval
  useEffect(() => {
    daysOffsetRef.current = 0;
    setLoading(true);
    setHasMore(true);
    fetchPosts(0, true);

    const interval = setInterval(() => {
      daysOffsetRef.current = 0;
      fetchPosts(0, true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Back-to-top button
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── "All" tab: apply followed leagues/teams ───────────────────────────────
  const prefFilteredPosts = useMemo(() => {
    if (activeLeague !== 'all') return posts;

    if (followedLeagueIds.size === 0 && followedTeamIds.size === 0) return posts;

    return posts
      .filter((post) => {
        if (followedLeagueIds.size > 0 && !followedLeagueIds.has(post.sport)) return false;
        return true;
      })
      .sort((a, b) => {
        if (followedTeamIds.size === 0) return 0;
        const aRelevant = isTeamRelevant(a, followedTeamIds);
        const bRelevant = isTeamRelevant(b, followedTeamIds);
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return 0;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, activeLeague, user?.followedLeagues, user?.followedTeams]);

  // ── League tab: filter by sport + optional selected team ──────────────────
  const leagueFilteredPosts = useMemo(() => {
    if (activeLeague === 'all') return prefFilteredPosts;

    const selectedTeamId = leagueTeamPicker[activeLeague];
    const sportPosts = posts.filter((p) => p.sport === activeLeague);

    if (!selectedTeamId) return sportPosts;

    // Find the team to get its abbreviation (needed for player perf posts)
    const teamList = teamsBySport[activeLeague] || [];
    const selectedTeam = teamList.find((t) => t.id === selectedTeamId);
    const selectedAbbr = selectedTeam?.abbreviation ?? '';

    return sportPosts.filter((post) => isPostForTeam(post, selectedTeamId, selectedAbbr));
  }, [posts, activeLeague, prefFilteredPosts, leagueTeamPicker, teamsBySport]);

  const visiblePosts = activeLeague === 'all' ? prefFilteredPosts : leagueFilteredPosts;

  // Auto-fetch when visible posts are empty but more exist
  useEffect(() => {
    if (!loading && !loadingMore && hasMore && visiblePosts.length === 0) {
      setLoadingMore(true);
      fetchPosts(daysOffsetRef.current, false);
    }
  }, [loading, loadingMore, hasMore, visiblePosts.length, fetchPosts]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchPosts(daysOffsetRef.current, false);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchPosts]);

  const selectedTeamForLeague = activeLeague !== 'all' ? leagueTeamPicker[activeLeague] : undefined;
  const teamsForLeague = activeLeague !== 'all' ? (teamsBySport[activeLeague] || []) : [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary">Feed</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Powered by Elite Picks AI
          {activeLeague === 'all' && followedLeagueIds.size > 0 && (
            <> · {Array.from(followedLeagueIds).map((l) => l.toUpperCase()).join(', ')}</>
          )}
        </p>
      </div>

      {/* League tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
        {LEAGUE_TABS.map((tab) => {
          const isActive = activeLeague === tab.id;
          const isLeague = tab.id !== 'all';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLeague(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? isLeague
                    ? LEAGUE_ACTIVE_BG[tab.id as Sport]
                    : 'bg-accent-green text-bg-primary'
                  : 'bg-white/8 text-text-secondary hover:text-text-primary hover:bg-white/12'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Per-league team picker (only shown when a league tab is active) */}
      {activeLeague !== 'all' && (
        <div className="mb-4">
          {teamsLoading ? (
            <div className="h-9 bg-bg-card rounded-xl animate-pulse" />
          ) : (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {/* "All teams" pill */}
              <button
                onClick={() =>
                  setLeagueTeamPicker((prev) => ({ ...prev, [activeLeague]: undefined }))
                }
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  !selectedTeamForLeague
                    ? `${LEAGUE_ACTIVE_BG[activeLeague as Sport]}`
                    : 'bg-white/8 text-text-secondary hover:text-text-primary hover:bg-white/12'
                }`}
              >
                All teams
              </button>

              {teamsForLeague.map((team) => {
                const isSelected = selectedTeamForLeague === team.id;
                const isFollowed = followedTeamIds.has(team.id);
                return (
                  <div key={team.id} className="flex-shrink-0 flex items-center">
                    {/* Team pill — click to filter feed view */}
                    <button
                      onClick={() =>
                        setLeagueTeamPicker((prev) => ({
                          ...prev,
                          [activeLeague]: isSelected ? undefined : team.id,
                        }))
                      }
                      className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-l-full text-xs font-semibold transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-white/20 text-text-primary'
                          : 'bg-white/8 text-text-secondary hover:text-text-primary hover:bg-white/12'
                      }`}
                    >
                      <Image
                        src={team.logo}
                        alt={team.abbreviation}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                      {team.abbreviation}
                    </button>
                    {/* Follow button — persists to account */}
                    {user ? (
                      <button
                        onClick={() => toggleFollowTeam(team.id, activeLeague as Sport)}
                        disabled={followSaving}
                        title={isFollowed ? 'Unfollow (remove from All tab)' : 'Follow (add to All tab)'}
                        className={`flex items-center justify-center w-7 h-[30px] rounded-r-full text-sm transition-colors disabled:opacity-40 ${
                          isSelected ? 'bg-white/20' : 'bg-white/8 hover:bg-white/12'
                        } ${isFollowed ? 'text-red-400' : 'text-white/30 hover:text-red-400'}`}
                      >
                        {isFollowed ? '♥' : '♡'}
                      </button>
                    ) : (
                      <div className={`w-7 h-[30px] rounded-r-full ${isSelected ? 'bg-white/20' : 'bg-white/8'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {user && (
            <p className="text-xs text-text-secondary mt-1.5">
              ♡ Follow teams to see them in your <span className="text-text-primary font-semibold">All</span> tab
            </p>
          )}
        </div>
      )}

      {/* Feed content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : visiblePosts.length === 0 && (loadingMore || hasMore) ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-lg text-text-secondary">No feed posts yet</p>
          <p className="text-sm text-text-secondary mt-1">Check back soon for updates from Elite Picks AI</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visiblePosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="space-y-3 mt-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          )}

          {!hasMore && visiblePosts.length > 0 && (
            <p className="text-center text-text-secondary text-xs py-8">
              You&apos;re all caught up · 50 days of history loaded
            </p>
          )}
        </>
      )}

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 w-9 h-9 bg-bg-card border border-white/10 rounded-full flex items-center justify-center shadow-lg text-text-secondary hover:text-text-primary transition-colors z-50"
          aria-label="Back to top"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTeamRelevant(post: FeedPost, followedTeams: Set<string>): boolean {
  if (post.type === 'big_game') {
    const d = post.data as BigGameData;
    return followedTeams.has(d.homeTeam.id) || followedTeams.has(d.awayTeam.id);
  }
  if (post.type === 'trending_pick') {
    const d = post.data as TrendingPickData;
    return followedTeams.has(d.teamId);
  }
  return false;
}

function isPostForTeam(post: FeedPost, teamId: string, teamAbbr: string): boolean {
  if (post.type === 'big_game') {
    const d = post.data as BigGameData;
    return d.homeTeam.id === teamId || d.awayTeam.id === teamId;
  }
  if (post.type === 'trending_pick') {
    const d = post.data as TrendingPickData;
    return d.teamId === teamId;
  }
  if (post.type === 'player_performance') {
    const d = post.data as PlayerPerformanceData;
    return d.teamAbbreviation === teamAbbr;
  }
  if (post.type === 'news') {
    const d = post.data as NewsData;
    // No team tags = general league news, always include
    if (!d.teamAbbreviations || d.teamAbbreviations.length === 0) return true;
    return d.teamAbbreviations.includes(teamAbbr);
  }
  return false;
}

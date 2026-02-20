'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Game, Sport } from '@/lib/types';
import { EPTPlayerBase, EPTGroupedResponse, fetchNBAEPT, fetchMLBEPT, fetchNFLEPT, fetchNHLEPT } from '@/lib/ept';
import { useUser } from '@/components/UserProvider';
import { usePicks } from '@/hooks/usePicks';
import { formatTime, addDays } from '@/lib/utils';
import { fetchGames } from '@/lib/espn';
import { getPicksByDate } from '@/lib/storage';

function useCountdown(startTime: string | undefined, status: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'scheduled' || !startTime) {
      setTimeLeft(null);
      return;
    }

    function compute() {
      const diff = new Date(startTime!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s`);
      else setTimeLeft(`${s}s`);
    }

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startTime, status]);

  return timeLeft;
}

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <GameDetailContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <Link href="/" className="text-accent-green text-sm font-semibold hover:underline">
        &larr; Back to Games
      </Link>
      <div className="mt-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function GameDetailContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') || '';
  const sport = (searchParams.get('sport') || 'nba') as Sport;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { username, isLoggedIn } = useUser();
  const { submitPick, getPickForGame, picksToday } = usePicks(username, date);

  const [game, setGame] = useState<Game | null>(null);
  const [eptData, setEptData] = useState<EPTGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3>(2);
  const [locking, setLocking] = useState(false);
  const [rosterGroup, setRosterGroup] = useState<string>('all');
  const [pickDist, setPickDist] = useState<{ awayPct: number; homePct: number; total: number } | null>(null);

  const countdown = useCountdown(game?.startTime, game?.status);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    let gameTimer: ReturnType<typeof setTimeout> | null = null;
    let eptInterval: ReturnType<typeof setInterval> | null = null;

    async function findGame(d: string): Promise<Game | null> {
      try {
        const games = await fetchGames(d);
        return games.find((g) => g.id === gameId) || null;
      } catch {
        return null;
      }
    }

    async function refreshGame() {
      if (cancelled) return;
      let found = await findGame(date);
      if (!found) {
        const prev = addDays(date, -1);
        const next = addDays(date, 1);
        const [prevGame, nextGame] = await Promise.all([findGame(prev), findGame(next)]);
        found = prevGame || nextGame;
      }
      if (cancelled) return;
      setGame(found);
      const delay = found?.status === 'in_progress' ? 30 * 1000 : found?.status === 'final' ? null : 2 * 60 * 1000;
      if (delay !== null) {
        gameTimer = setTimeout(refreshGame, delay);
      }
    }

    async function loadEpt() {
      try {
        let ept: EPTGroupedResponse;
        switch (sport) {
          case 'mlb': ept = await fetchMLBEPT(); break;
          case 'nfl': ept = await fetchNFLEPT(); break;
          case 'nhl': ept = await fetchNHLEPT(); break;
          default: ept = await fetchNBAEPT(); break;
        }
        if (!cancelled) {
          setEptData(ept);
          setRosterGroup((prev) => prev || Object.keys(ept.groups)[0] || 'all');
        }
      } catch { /* EPT data is optional */ }
    }

    async function initialLoad() {
      setLoading(true);
      let found = await findGame(date);
      if (!found) {
        const prev = addDays(date, -1);
        const next = addDays(date, 1);
        const [prevGame, nextGame] = await Promise.all([findGame(prev), findGame(next)]);
        found = prevGame || nextGame;
      }
      if (cancelled) return;
      setGame(found);

      if (found) {
        try {
          const allPicks = await getPicksByDate(found.date);
          const gamePicks = allPicks.filter((p) => p.gameId === gameId);
          if (gamePicks.length > 0) {
            const awayCount = gamePicks.filter((p) => p.pickedTeamId === found!.awayTeam.id).length;
            const homeCount = gamePicks.filter((p) => p.pickedTeamId === found!.homeTeam.id).length;
            const total = awayCount + homeCount;
            if (!cancelled) {
              setPickDist({
                awayPct: Math.round((awayCount / total) * 100),
                homePct: Math.round((homeCount / total) * 100),
                total,
              });
            }
          }
        } catch { /* ignore */ }
      }

      await loadEpt();
      if (!cancelled) setLoading(false);

      const delay = found?.status === 'in_progress' ? 30 * 1000 : found?.status === 'final' ? null : 2 * 60 * 1000;
      if (delay !== null) gameTimer = setTimeout(refreshGame, delay);
      eptInterval = setInterval(loadEpt, 5 * 60 * 1000);
    }

    initialLoad();

    return () => {
      cancelled = true;
      if (gameTimer) clearTimeout(gameTimer);
      if (eptInterval) clearInterval(eptInterval);
    };
  }, [gameId, date, sport]);

  const pick = getPickForGame(gameId);
  const pickedTeamId = pick?.pickedTeamId;
  const isCorrect = pick?.result === 'correct';
  const isIncorrect = pick?.result === 'incorrect';

  const eptGroups = eptData ? Object.keys(eptData.groups) : [];

  const { awayPlayers, homePlayers } = useMemo(() => {
    if (!game || !eptData) return { awayPlayers: [], homePlayers: [] };
    const groupPlayers = eptData.groups[rosterGroup] || [];
    const awayAbbr = game.awayTeam.abbreviation;
    const homeAbbr = game.homeTeam.abbreviation;
    const away = groupPlayers
      .filter((p) => p.team === awayAbbr || p.team.includes(awayAbbr))
      .sort((a, b) => b.ept - a.ept);
    const home = groupPlayers
      .filter((p) => p.team === homeAbbr || p.team.includes(homeAbbr))
      .sort((a, b) => b.ept - a.ept);
    return { awayPlayers: away, homePlayers: home };
  }, [game, eptData, rosterGroup]);

  const awayAvgEPT = awayPlayers.length
    ? +(awayPlayers.reduce((s, p) => s + p.ept, 0) / awayPlayers.length).toFixed(1)
    : 0;
  const homeAvgEPT = homePlayers.length
    ? +(homePlayers.reduce((s, p) => s + p.ept, 0) / homePlayers.length).toFixed(1)
    : 0;

  async function handlePick(teamId: string) {
    if (!isLoggedIn || locking) return;
    setLocking(true);
    try {
      await submitPick(gameId, teamId, game?.date, confidence);
      setPendingTeamId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit pick');
    } finally {
      setLocking(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/" className="text-accent-green text-sm font-semibold hover:underline">
          &larr; Back to Games
        </Link>
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-text-secondary">Game not found</p>
        <Link href="/" className="text-accent-green text-sm font-semibold hover:underline mt-4 inline-block">
          &larr; Back to Games
        </Link>
      </div>
    );
  }

  const isLocked = game.status !== 'scheduled';
  const isFinal = game.status === 'final';
  const isLive = game.status === 'in_progress';
  const dailyLimitReached = isLoggedIn && !pickedTeamId && picksToday >= 3;
  const canPick = !isLocked && isLoggedIn && !pickedTeamId && !dailyLimitReached;

  return (
    <div>
      <Link href="/" className="text-accent-green text-sm font-semibold hover:underline">
        &larr; Back to Games
      </Link>

      <div className="mt-4 bg-bg-card border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-secondary uppercase font-semibold">
            {sport.toUpperCase()}
          </span>
          <span className="text-xs text-text-secondary">
            {isFinal ? 'FINAL' : isLive ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 font-semibold">LIVE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>{formatTime(game.startTime)}</span>
                {countdown && (
                  <span className="text-accent-green font-semibold">({countdown})</span>
                )}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.awayTeam.logo} alt={game.awayTeam.abbreviation} className="w-16 h-16 object-contain" />
            <span className="font-bold text-lg text-text-primary">{game.awayTeam.abbreviation}</span>
            <span className="text-xs text-text-secondary">{game.awayTeam.displayName}</span>
            <span className="text-xs text-text-secondary">{game.awayTeam.record}</span>
            {(isLive || isFinal) && game.awayScore !== null && (
              <span className="text-3xl font-extrabold text-text-primary">{game.awayScore}</span>
            )}
          </div>

          <div className="px-4">
            <span className="text-text-secondary text-sm font-bold">VS</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.homeTeam.logo} alt={game.homeTeam.abbreviation} className="w-16 h-16 object-contain" />
            <span className="font-bold text-lg text-text-primary">{game.homeTeam.abbreviation}</span>
            <span className="text-xs text-text-secondary">{game.homeTeam.displayName}</span>
            <span className="text-xs text-text-secondary">{game.homeTeam.record}</span>
            {(isLive || isFinal) && game.homeScore !== null && (
              <span className="text-3xl font-extrabold text-text-primary">{game.homeScore}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-bg-card border border-white/5 rounded-xl p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3 text-center">
          {pickedTeamId ? 'Your Pick' : isLocked ? 'Picks Locked' : dailyLimitReached ? 'Daily Limit Reached' : 'Make Your Pick'}
        </h3>
        <div className="flex gap-3">
          <PickButton
            team={game.awayTeam}
            isPicked={pickedTeamId === game.awayTeam.id}
            isPending={pendingTeamId === game.awayTeam.id}
            isCorrect={pickedTeamId === game.awayTeam.id && isCorrect}
            isIncorrect={pickedTeamId === game.awayTeam.id && isIncorrect}
            points={pickedTeamId === game.awayTeam.id ? pick?.pointsEarned : undefined}
            disabled={!canPick}
            onClick={() => canPick && setPendingTeamId(pendingTeamId === game.awayTeam.id ? null : game.awayTeam.id)}
          />
          <PickButton
            team={game.homeTeam}
            isPicked={pickedTeamId === game.homeTeam.id}
            isPending={pendingTeamId === game.homeTeam.id}
            isCorrect={pickedTeamId === game.homeTeam.id && isCorrect}
            isIncorrect={pickedTeamId === game.homeTeam.id && isIncorrect}
            points={pickedTeamId === game.homeTeam.id ? pick?.pointsEarned : undefined}
            disabled={!canPick}
            onClick={() => canPick && setPendingTeamId(pendingTeamId === game.homeTeam.id ? null : game.homeTeam.id)}
          />
        </div>
        {pendingTeamId && !pickedTeamId && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-text-secondary mr-1">Confidence:</span>
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setConfidence(n)}
                  className={`text-lg transition-colors ${n <= confidence ? 'text-accent-gold' : 'text-white/15 hover:text-white/30'}`}
                  title={n === 1 ? 'Low' : n === 2 ? 'Medium' : 'High'}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePick(pendingTeamId)}
                disabled={locking}
                className="flex-1 bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all text-sm tracking-wide"
              >
                {locking ? 'Locking...' : 'Lock It In'}
              </button>
              <button
                onClick={() => setPendingTeamId(null)}
                disabled={locking}
                className="px-4 py-2.5 rounded-lg border border-white/10 text-text-secondary hover:bg-white/5 transition-all text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {!isLoggedIn && !isLocked && (
          <p className="text-xs text-text-secondary text-center mt-3">Sign up to make picks</p>
        )}
        {dailyLimitReached && !isLocked && (
          <p className="text-xs text-text-secondary text-center mt-3">You&apos;ve used all 3 picks for today. Come back tomorrow.</p>
        )}
      </div>

      {pickDist && pickDist.total > 0 && (
        <div className="mt-4 bg-bg-card border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-bold text-text-primary mb-3 text-center">
            Community Picks <span className="text-text-secondary font-normal">({pickDist.total} picks)</span>
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-text-primary w-8 text-right">{pickDist.awayPct}%</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10 flex">
              <div
                className="h-full bg-accent-green transition-all duration-500"
                style={{ width: `${pickDist.awayPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-text-primary w-8">{pickDist.homePct}%</span>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-text-secondary">{game.awayTeam.abbreviation}</span>
            <span className="text-xs text-text-secondary">{game.homeTeam.abbreviation}</span>
          </div>
        </div>
      )}

      <div className="mt-4 bg-bg-card border border-white/5 rounded-xl p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3 text-center">Team EPT Comparison</h3>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-accent-green">{awayAvgEPT}</p>
            <p className="text-xs text-text-secondary">Avg EPT ({game.awayTeam.abbreviation})</p>
          </div>
          <div className="flex items-center">
            <span className="text-text-secondary text-xs font-semibold">VS</span>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-accent-green">{homeAvgEPT}</p>
            <p className="text-xs text-text-secondary">Avg EPT ({game.homeTeam.abbreviation})</p>
          </div>
        </div>

        {(awayPlayers.length > 0 || homePlayers.length > 0) && (
          <div className="border-t border-white/10 pt-4">
            {eptGroups.length > 1 && (
              <div className="flex justify-center mb-3">
                <select
                  value={rosterGroup}
                  onChange={(e) => setRosterGroup(e.target.value)}
                  className="bg-white/5 border border-white/10 text-text-primary text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-green cursor-pointer"
                >
                  {eptGroups.map((g) => (
                    <option key={g} value={g}>
                      {({'all':'All','hitting':'Hitting','pitching':'Pitching','qb':'QB','rb':'RB','wr':'WR','te':'TE','def':'DEF','k':'K','skaters':'Skaters','goalies':'Goalies'} as Record<string,string>)[g] || g}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-text-secondary mb-2 text-center">{game.awayTeam.abbreviation} Roster ({awayPlayers.length})</h4>
                <div className="space-y-2">
                  {awayPlayers.map((p) => (
                    <PlayerCard key={`${p.name}-${p.rank}`} player={p} />
                  ))}
                  {awayPlayers.length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-4">No EPT data</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-secondary mb-2 text-center">{game.homeTeam.abbreviation} Roster ({homePlayers.length})</h4>
                <div className="space-y-2">
                  {homePlayers.map((p) => (
                    <PlayerCard key={`${p.name}-${p.rank}`} player={p} />
                  ))}
                  {homePlayers.length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-4">No EPT data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {awayPlayers.length === 0 && homePlayers.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-4">
            No EPT player data available for this matchup
          </p>
        )}
      </div>
    </div>
  );
}

function PickButton({
  team,
  isPicked,
  isPending,
  isCorrect,
  isIncorrect,
  points,
  disabled,
  onClick,
}: {
  team: Game['homeTeam'];
  isPicked: boolean;
  isPending: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
  points?: number;
  disabled: boolean;
  onClick: () => void;
}) {
  let cls = 'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all ';
  if (isCorrect) cls += 'bg-correct/10 border border-correct/30';
  else if (isIncorrect) cls += 'bg-incorrect/10 border border-incorrect/30';
  else if (isPicked) cls += 'bg-accent-green/10 border border-accent-green/30';
  else if (isPending) cls += 'bg-accent-green/15 border-2 border-accent-green/50 scale-[1.02]';
  else if (disabled) cls += 'opacity-60 border border-transparent cursor-not-allowed';
  else cls += 'border border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer';

  return (
    <button className={cls} onClick={onClick} disabled={disabled && !isPicked}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={team.logo} alt={team.abbreviation} className="w-10 h-10 object-contain" />
      <span className="font-bold text-sm text-text-primary">{team.abbreviation}</span>
      {isPicked && !isCorrect && !isIncorrect && (
        <span className="text-xs text-accent-green font-semibold">YOUR PICK</span>
      )}
      {isCorrect && (
        <span className="text-xs text-correct font-semibold">+{points || 0} pts</span>
      )}
      {isIncorrect && (
        <span className="text-xs text-incorrect font-semibold">MISS</span>
      )}
    </button>
  );
}

function PlayerCard({ player }: { player: EPTPlayerBase }) {
  const [expanded, setExpanded] = useState(false);
  const allStats = Object.entries(player.stats);
  const previewStats = allStats.slice(0, 3);
  const rankLabel = player.rank ? `#${player.rank}` : '—';
  const rankColor = player.rank <= 10 ? 'text-amber-400' : player.rank <= 25 ? 'text-accent-green' : 'text-text-secondary';

  return (
    <div
      className="bg-white/5 rounded-lg p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 shrink-0">
          {player.imageUrl ? (
            <Image
              src={player.imageUrl}
              alt={player.name}
              width={36}
              height={36}
              className="w-full h-full object-cover object-top"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-text-secondary font-bold">
              {player.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-xs font-bold w-7 shrink-0 ${rankColor}`}>{rankLabel}</span>
              <span className="text-sm font-medium text-text-primary truncate">{player.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-sm font-bold text-accent-green">{player.ept}</span>
              <span className="text-text-secondary text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
          {!expanded && (
            <div className="flex gap-3 mt-0.5 ml-8">
              {previewStats.map(([key, val]) => (
                <span key={key} className="text-xs text-text-secondary">
                  <span className="font-semibold">{val}</span> {key}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 ml-11">
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            {allStats.map(([key, val]) => (
              <div key={key}>
                <p className="text-xs font-bold text-text-primary">{val}</p>
                <p className="text-xs text-text-secondary">{key}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">EPT Rating</span>
            <span className="text-sm font-extrabold text-accent-green">{player.ept}</span>
          </div>
        </div>
      )}
    </div>
  );
}

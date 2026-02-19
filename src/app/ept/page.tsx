'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { EPTPlayerBase, EPTGroupedResponse } from '@/lib/ept';

type Sport = 'nba' | 'mlb' | 'nfl' | 'nhl';

const SPORT_LABELS: Record<Sport, string> = { nba: 'NBA', mlb: 'MLB', nfl: 'NFL', nhl: 'NHL' };

const SPORT_COLUMNS: Record<string, { key: string; label: string }[]> = {
  nba: [
    { key: 'PPG', label: 'PPG' },
    { key: 'RPG', label: 'RPG' },
    { key: 'APG', label: 'APG' },
    { key: 'SPG', label: 'SPG' },
    { key: 'BPG', label: 'BPG' },
  ],
  mlb_hitting: [
    { key: 'AVG', label: 'AVG' },
    { key: 'H', label: 'H' },
    { key: 'HR', label: 'HR' },
    { key: 'RBI', label: 'RBI' },
    { key: 'R', label: 'R' },
    { key: 'SB', label: 'SB' },
    { key: 'BB', label: 'BB' },
  ],
  mlb_pitching: [
    { key: 'ERA', label: 'ERA' },
    { key: 'W', label: 'W' },
    { key: 'L', label: 'L' },
    { key: 'SO', label: 'SO' },
    { key: 'SV', label: 'SV' },
    { key: 'IP', label: 'IP' },
    { key: 'WHIP', label: 'WHIP' },
  ],
  nfl_qb: [
    { key: 'PASS YDS', label: 'YDS' },
    { key: 'PASS TD', label: 'TD' },
    { key: 'INT', label: 'INT' },
    { key: 'RUSH YDS', label: 'RYDS' },
    { key: 'RTG', label: 'RTG' },
  ],
  nfl_rb: [
    { key: 'RUSH YDS', label: 'RYDS' },
    { key: 'REC YDS', label: 'RECYDS' },
    { key: 'TD', label: 'TD' },
    { key: 'REC', label: 'REC' },
  ],
  nfl_wr: [
    { key: 'REC', label: 'REC' },
    { key: 'REC YDS', label: 'RECYDS' },
    { key: 'TD', label: 'TD' },
  ],
  nfl_te: [
    { key: 'REC', label: 'REC' },
    { key: 'REC YDS', label: 'RECYDS' },
    { key: 'TD', label: 'TD' },
  ],
  nfl_def: [
    { key: 'TKL', label: 'TKL' },
    { key: 'SACK', label: 'SACK' },
    { key: 'INT', label: 'INT' },
    { key: 'TFL', label: 'TFL' },
    { key: 'FF', label: 'FF' },
    { key: 'PD', label: 'PD' },
  ],
  nfl_k: [
    { key: 'FGM', label: 'FGM' },
    { key: 'FGA', label: 'FGA' },
    { key: 'XPM', label: 'XPM' },
    { key: 'LONG FG', label: 'LNG' },
  ],
  nhl_skaters: [
    { key: 'G', label: 'G' },
    { key: 'A', label: 'A' },
    { key: 'PTS', label: 'PTS' },
    { key: '+/-', label: '+/-' },
    { key: 'PIM', label: 'PIM' },
    { key: 'PPG', label: 'PPG' },
    { key: 'SOG', label: 'SOG' },
  ],
  nhl_goalies: [
    { key: 'W', label: 'W' },
    { key: 'L', label: 'L' },
    { key: 'OTL', label: 'OTL' },
    { key: 'GAA', label: 'GAA' },
    { key: 'SV%', label: 'SV%' },
    { key: 'SO', label: 'SO' },
    { key: 'SV', label: 'SV' },
  ],
};

const GROUP_LABELS: Record<string, string> = {
  all: 'All Players',
  hitting: 'Hitting',
  pitching: 'Pitching',
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  def: 'DEF',
  k: 'K',
  skaters: 'Skaters',
  goalies: 'Goalies',
};

function getColumnsKey(sport: Sport, group: string): string {
  if (sport === 'nba') return 'nba';
  return `${sport}_${group}`;
}

export default function EPTPage() {
  const [sport, setSport] = useState<Sport>('nba');
  const [data, setData] = useState<EPTGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveGroup('');
    setSearch('');

    async function load() {
      try {
        const res = await fetch(`/api/ept?sport=${sport}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json: EPTGroupedResponse = await res.json();
        if (cancelled) return;
        setData(json);
        setActiveGroup((prev) => prev || Object.keys(json.groups)[0] || '');
      } catch {
        if (!cancelled) setError(`Failed to load ${SPORT_LABELS[sport]} EPT rankings`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sport]);

  const groups = data ? Object.keys(data.groups) : [];
  const allPlayers = data && activeGroup ? data.groups[activeGroup] || [] : [];
  const players = search.trim()
    ? allPlayers.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()) || p.team.toLowerCase().includes(search.trim().toLowerCase()))
    : allPlayers;
  const top = search.trim() ? null : allPlayers[0];
  const colKey = getColumnsKey(sport, activeGroup);
  const columns = SPORT_COLUMNS[colKey] || [];
  const formula = data?.formula?.[activeGroup] || data?.formula?.['all'] || '';

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">EPT Rankings</h1>
        <p className="text-text-secondary text-sm mt-1">
          Elite Player Tracker ratings
        </p>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 justify-center mb-4">
        {(['nba', 'mlb', 'nfl', 'nhl'] as Sport[]).map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              sport === s
                ? 'bg-accent-green text-white'
                : 'bg-bg-card text-text-secondary hover:text-text-primary border border-white/10'
            }`}
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          <p className="text-text-secondary text-sm text-center">Loading {SPORT_LABELS[sport]} rankings...</p>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-lg text-text-secondary">{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Group sub-tabs */}
          {groups.length > 1 && (
            <div className="flex gap-2 justify-center mb-4 flex-wrap">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    activeGroup === g
                      ? 'bg-white/10 text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {GROUP_LABELS[g] || g}
                </button>
              ))}
            </div>
          )}

          <p className="text-text-secondary text-xs text-center mb-4">
            {data.season} &middot; {search.trim() ? `${players.length} results` : `Top ${allPlayers.length} players`}
          </p>

          {top && <TopPlayerCard player={top} columns={columns} />}

          <div className="mt-6">
            <input
              type="text"
              placeholder="Search for players"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-card border border-white/10 rounded-lg px-4 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-green transition mb-3"
            />
          </div>

          <div className="bg-bg-card border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-text-secondary text-xs">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-right font-bold text-accent-green">EPT</th>
                    {columns.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-right">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan={4 + columns.length} className="px-4 py-8 text-center text-text-secondary text-sm">
                        No players found
                      </td>
                    </tr>
                  ) : (
                    players.map((player) => (
                      <PlayerRow key={`${player.name}-${player.rank}`} player={player} columns={columns} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {formula && (
            <div className="mt-6 bg-bg-card border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-bold text-text-primary mb-2">
                EPT Formula ({GROUP_LABELS[activeGroup] || activeGroup})
              </h3>
              <p className="text-xs text-text-secondary font-mono">{formula}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TopPlayerCard({ player, columns }: { player: EPTPlayerBase; columns: { key: string; label: string }[] }) {
  const displayStats = columns.slice(0, 3);
  return (
    <div className="bg-bg-card border border-accent-green/20 rounded-xl p-5 card-glow-picked">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {player.imageUrl && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
              <Image
                src={player.imageUrl}
                alt={player.name}
                fill
                className="object-cover object-top"
                unoptimized
              />
            </div>
          )}
          <div>
            <span className="text-xs text-accent-green font-semibold">#1 EPT RATED</span>
            <h2 className="text-xl font-bold text-text-primary mt-1">{player.name}</h2>
            <p className="text-sm text-text-secondary">{player.team}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-accent-green">{player.ept}</p>
          <p className="text-xs text-text-secondary">EPT Rating</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
        {displayStats.map((col) => (
          <Stat key={col.key} label={col.label} value={player.stats[col.key]} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-text-primary">{value ?? '-'}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

function PlayerRow({ player, columns }: { player: EPTPlayerBase; columns: { key: string; label: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const allStats = Object.entries(player.stats);
  const colSpanCount = 4 + columns.length;

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-text-secondary font-semibold">{player.rank}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {player.imageUrl && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                <Image
                  src={player.imageUrl}
                  alt={player.name}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-text-primary font-medium">{player.name}</span>
              <span className="text-text-secondary text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-text-secondary">{player.team}</td>
        <td className="px-4 py-3 text-right font-bold text-accent-green">{player.ept}</td>
        {columns.map((col) => (
          <td key={col.key} className="px-4 py-3 text-right text-text-secondary">
            {player.stats[col.key] ?? '-'}
          </td>
        ))}
      </tr>
      {expanded && (
        <tr className="border-b border-white/5 bg-white/[0.02]">
          <td colSpan={colSpanCount} className="px-4 py-3">
            <div className="grid grid-cols-4 gap-3">
              {allStats.map(([key, val]) => (
                <div key={key} className="text-center bg-white/5 rounded-lg py-2 px-3">
                  <p className="text-sm font-bold text-text-primary">{val ?? '-'}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{key}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">EPT Rating</span>
              <span className="text-sm font-extrabold text-accent-green">{player.ept}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

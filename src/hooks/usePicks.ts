'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pick } from '@/lib/types';
import { getPicksByUserAndDate, upsertPick } from '@/lib/storage';
import { fetchGames } from '@/lib/espn';
import { addDays } from '@/lib/utils';

export function usePicks(username: string | null, date: string) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPicks = useCallback(async () => {
    if (!username) {
      setPicks([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getPicksByUserAndDate(username, date);
      setPicks(data);
    } finally {
      setLoading(false);
    }
  }, [username, date]);

  useEffect(() => {
    setLoading(true);
    fetchPicks();
  }, [fetchPicks]);

  const submitPick = useCallback(
    async (gameId: string, pickedTeamId: string, gameDate?: string, confidence?: 1 | 2 | 3) => {
      if (!username) return;

      const pickDate = gameDate ?? date;

      // Enforce 3-picks-per-day limit
      const todayPicks = await getPicksByUserAndDate(username, pickDate);
      const existingPickForThisGame = todayPicks.find((p) => p.gameId === gameId);
      if (!existingPickForThisGame) {
        const uniqueGamesPickedToday = new Set(todayPicks.map((p) => p.gameId)).size;
        if (uniqueGamesPickedToday >= 3) {
          throw new Error('Daily pick limit reached (3 picks per day)');
        }
      }

      // Find game across ±1 day to handle ESPN UTC boundary
      const dates = [pickDate, addDays(pickDate, -1), addDays(pickDate, 1)];
      let game = null;
      for (const d of dates) {
        const games = await fetchGames(d);
        const found = games.find((g) => g.id === gameId);
        if (found) { game = found; break; }
      }

      if (!game) throw new Error('Game not found');
      if (game.status !== 'scheduled') throw new Error('Game has already started');

      const gameStart = new Date(game.startTime).getTime();
      if (Date.now() >= gameStart) throw new Error('Game has already started');

      const pickId = `${username}-${gameId}`;
      const pick: Pick = {
        id: pickId,
        username,
        gameId,
        date: pickDate,
        pickedTeamId,
        timestamp: Date.now(),
        result: 'pending',
        pointsEarned: 0,
        sport: game.sport,
        confidence: [1, 2, 3].includes(confidence as number) ? confidence as 1 | 2 | 3 : undefined,
      };

      await upsertPick(pick);
      setPicks((prev) => {
        const filtered = prev.filter((p) => p.gameId !== gameId);
        return [...filtered, pick];
      });
      return pick;
    },
    [username, date]
  );

  const getPickForGame = useCallback(
    (gameId: string) => picks.find((p) => p.gameId === gameId),
    [picks]
  );

  const picksToday = picks.length;

  return { picks, loading, submitPick, getPickForGame, refresh: fetchPicks, picksToday };
}

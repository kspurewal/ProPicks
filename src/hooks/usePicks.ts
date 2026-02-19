'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pick } from '@/lib/types';

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
      const res = await fetch(`/api/picks?username=${username}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setPicks(data.picks);
      }
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
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gameId, pickedTeamId, date: gameDate ?? date, confidence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPicks((prev) => {
        const filtered = prev.filter((p) => p.gameId !== gameId);
        return [...filtered, data.pick];
      });
      return data.pick;
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

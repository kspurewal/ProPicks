'use client';

import { useState, useEffect, useCallback } from 'react';
import { Game } from '@/lib/types';

export function useGames(date: string) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/games?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch games');
      const data = await res.json();
      setGames(data.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const hasLive = games.some((g) => g.status === 'in_progress');
    if (!hasLive) return;
    const interval = setInterval(fetchGames, 60000);
    return () => clearInterval(interval);
  }, [games, fetchGames]);

  return { games, loading, error, refresh: fetchGames };
}

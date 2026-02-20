'use client';

import { useState, useEffect, useCallback } from 'react';
import { Game } from '@/lib/types';
import { fetchGames } from '@/lib/espn';

export function useGames(date: string) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchGames(date);
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    const hasLive = games.some((g) => g.status === 'in_progress');
    if (!hasLive) return;
    const interval = setInterval(loadGames, 60000);
    return () => clearInterval(interval);
  }, [games, loadGames]);

  return { games, loading, error, refresh: loadGames };
}

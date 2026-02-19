'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';

const STORAGE_KEY = 'propicks_username';

export function useUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUsername(stored);
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUser(name: string) {
    try {
      const res = await fetch(`/api/users?username=${name}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (name: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem(STORAGE_KEY, name);
    setUsername(name);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
    setUser(null);
  }, []);

  const refresh = useCallback(() => {
    if (username) fetchUser(username);
  }, [username]);

  return { username, user, loading, login, logout, refresh, isLoggedIn: !!username };
}

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Sport } from '@/lib/types';

const STORAGE_KEY = 'propicks_username';

interface UserContextType {
  username: string | null;
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (name: string) => Promise<User>;
  logout: () => void;
  refresh: () => void;
  savePreferences: (leagues: Sport[], teams: string[]) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  username: null,
  user: null,
  loading: true,
  isLoggedIn: false,
  login: async () => { throw new Error('No provider'); },
  logout: () => {},
  refresh: () => {},
  savePreferences: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUsername(stored);
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, []);

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

  const savePreferences = useCallback(async (leagues: Sport[], teams: string[]) => {
    if (!username) return;
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, followedLeagues: leagues, followedTeams: teams }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  }, [username]);

  return (
    <UserContext.Provider value={{ username, user, loading, isLoggedIn: !!username, login, logout, refresh, savePreferences }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

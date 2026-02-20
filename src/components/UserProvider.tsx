'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Sport } from '@/lib/types';
import { getUser, upsertUser } from '@/lib/storage';
import { getInappropriateReason } from '@/lib/profanity';

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
      const u = await getUser(name);
      if (u) {
        if (u.isBanned) {
          localStorage.removeItem(STORAGE_KEY);
          setUsername(null);
          setUser(null);
        } else {
          setUser(u);
        }
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
    const clean = name.trim();

    if (clean.length < 3 || clean.length > 20) {
      throw new Error('Username must be 3-20 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const inappropriateReason = getInappropriateReason(clean);
    if (inappropriateReason) {
      throw new Error(inappropriateReason);
    }

    const existing = await getUser(clean);
    if (existing) {
      if (existing.isBanned) {
        throw new Error('This account has been banned');
      }
      if (localStorage.getItem(STORAGE_KEY) !== clean) {
        throw new Error('Username already taken');
      }
      localStorage.setItem(STORAGE_KEY, clean);
      setUsername(clean);
      setUser(existing);
      return existing;
    }

    const newUser: User = {
      username: clean,
      createdAt: Date.now(),
      totalPoints: 0,
      weeklyPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalPicks: 0,
      correctPicks: 0,
      badges: [],
      followedLeagues: [],
      followedTeams: [],
    };

    await upsertUser(newUser);
    localStorage.setItem(STORAGE_KEY, clean);
    setUsername(clean);
    setUser(newUser);
    return newUser;
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
    if (!username || !user) return;
    const VALID_SPORTS: Sport[] = ['nba', 'mlb', 'nfl', 'nhl'];
    const updated: User = {
      ...user,
      followedLeagues: leagues.filter((l) => VALID_SPORTS.includes(l)),
      followedTeams: teams.filter((t) => typeof t === 'string'),
    };
    await upsertUser(updated);
    setUser(updated);
  }, [username, user]);

  return (
    <UserContext.Provider value={{ username, user, loading, isLoggedIn: !!username, login, logout, refresh, savePreferences }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

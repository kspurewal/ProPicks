import fs from 'fs';
import path from 'path';
import { User, Pick } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_DIR = path.join(DATA_DIR, 'games-cache');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureFile(filePath: string, defaultContent: string = '[]') {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf-8');
  }
}

export function readJSON<T>(filePath: string, defaultValue: T): T {
  const fullPath = path.join(DATA_DIR, filePath);
  ensureFile(fullPath, JSON.stringify(defaultValue));
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function writeJSON<T>(filePath: string, data: T): void {
  const fullPath = path.join(DATA_DIR, filePath);
  ensureFile(fullPath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readGameCache(date: string): unknown | null {
  ensureDir(CACHE_DIR);
  const filePath = path.join(CACHE_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const stat = fs.statSync(filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
    return { data, ageMinutes };
  } catch {
    return null;
  }
}

export function writeGameCache(date: string, data: unknown): void {
  ensureDir(CACHE_DIR);
  const filePath = path.join(CACHE_DIR, `${date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getUsers(): User[] {
  return readJSON<User[]>('users.json', []);
}

export function saveUsers(users: User[]): void {
  writeJSON('users.json', users);
}

export function getUser(username: string): User | undefined {
  const user = getUsers().find((u) => u.username === username);
  if (user) {
    // Backfill new fields for existing users
    if (!user.followedLeagues) user.followedLeagues = [];
    if (!user.followedTeams) user.followedTeams = [];
  }
  return user;
}

export function upsertUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.username === user.username);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  saveUsers(users);
}

export function getPicks(): Pick[] {
  return readJSON<Pick[]>('picks.json', []);
}

export function savePicks(picks: Pick[]): void {
  writeJSON('picks.json', picks);
}

export function getPicksByDate(date: string): Pick[] {
  return getPicks().filter((p) => p.date === date);
}

export function getPicksByUser(username: string): Pick[] {
  return getPicks().filter((p) => p.username === username);
}

export function getPicksByUserAndDate(username: string, date: string): Pick[] {
  return getPicks().filter((p) => p.username === username && p.date === date);
}

export function upsertPick(pick: Pick): void {
  const picks = getPicks();
  const idx = picks.findIndex((p) => p.id === pick.id);
  if (idx >= 0) {
    picks[idx] = pick;
  } else {
    picks.push(pick);
  }
  savePicks(picks);
}

export function readMeta(): Record<string, unknown> {
  return readJSON<Record<string, unknown>>('meta.json', {});
}

export function writeMeta(meta: Record<string, unknown>): void {
  writeJSON('meta.json', meta);
}

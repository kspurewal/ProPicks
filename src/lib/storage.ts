// Firebase Firestore storage — replaces file-based storage for static hosting
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Pick } from './types';

// ---- Users ----

export async function getUser(username: string): Promise<User | undefined> {
  const ref = doc(db, 'users', username);
  const snap = await getDoc(ref);
  if (!snap.exists()) return undefined;
  const data = snap.data() as User;
  if (!data.followedLeagues) data.followedLeagues = [];
  if (!data.followedTeams) data.followedTeams = [];
  return data;
}

export async function upsertUser(user: User): Promise<void> {
  const ref = doc(db, 'users', user.username);
  await setDoc(ref, user);
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data() as User;
    if (!data.followedLeagues) data.followedLeagues = [];
    if (!data.followedTeams) data.followedTeams = [];
    return data;
  });
}

export async function followUser(currentUsername: string, targetUsername: string): Promise<void> {
  const currentRef = doc(db, 'users', currentUsername);
  const targetRef = doc(db, 'users', targetUsername);
  const [currentSnap, targetSnap] = await Promise.all([getDoc(currentRef), getDoc(targetRef)]);
  if (!currentSnap.exists() || !targetSnap.exists()) return;
  const current = currentSnap.data() as User;
  const target = targetSnap.data() as User;
  const currentFollowing = current.following || [];
  const targetFollowers = target.followers || [];
  if (!currentFollowing.includes(targetUsername)) {
    await Promise.all([
      updateDoc(currentRef, { following: [...currentFollowing, targetUsername] }),
      updateDoc(targetRef, { followers: [...targetFollowers, currentUsername] }),
    ]);
  }
}

export async function unfollowUser(currentUsername: string, targetUsername: string): Promise<void> {
  const currentRef = doc(db, 'users', currentUsername);
  const targetRef = doc(db, 'users', targetUsername);
  const [currentSnap, targetSnap] = await Promise.all([getDoc(currentRef), getDoc(targetRef)]);
  if (!currentSnap.exists() || !targetSnap.exists()) return;
  const current = currentSnap.data() as User;
  const target = targetSnap.data() as User;
  await Promise.all([
    updateDoc(currentRef, { following: (current.following || []).filter((u) => u !== targetUsername) }),
    updateDoc(targetRef, { followers: (target.followers || []).filter((u) => u !== currentUsername) }),
  ]);
}

export async function getFollowing(username: string): Promise<User[]> {
  const snap = await getDoc(doc(db, 'users', username));
  if (!snap.exists()) return [];
  const user = snap.data() as User;
  const following = user.following || [];
  if (following.length === 0) return [];
  const users = await Promise.all(following.map((u) => getDoc(doc(db, 'users', u))));
  return users.filter((s) => s.exists()).map((s) => s.data() as User);
}

export async function banUser(username: string): Promise<void> {
  const ref = doc(db, 'users', username);
  await updateDoc(ref, { isBanned: true });
}

export async function unbanUser(username: string): Promise<void> {
  const ref = doc(db, 'users', username);
  await updateDoc(ref, { isBanned: false });
}

// ---- Picks ----

export async function getPicks(): Promise<Pick[]> {
  const snap = await getDocs(collection(db, 'picks'));
  return snap.docs.map((d) => d.data() as Pick);
}

export async function getPicksByDate(date: string): Promise<Pick[]> {
  const q = query(collection(db, 'picks'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Pick);
}

export async function getPicksByUser(username: string): Promise<Pick[]> {
  const q = query(collection(db, 'picks'), where('username', '==', username));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Pick);
}

export async function getPicksByUserAndDate(username: string, date: string): Promise<Pick[]> {
  const q = query(
    collection(db, 'picks'),
    where('username', '==', username),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Pick);
}

export async function upsertPick(pick: Pick): Promise<void> {
  const ref = doc(db, 'picks', pick.id);
  await setDoc(ref, pick);
}

// ---- Meta ----

export async function readMeta(): Promise<Record<string, unknown>> {
  const ref = doc(db, 'meta', 'app');
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  return snap.data() as Record<string, unknown>;
}

export async function writeMeta(meta: Record<string, unknown>): Promise<void> {
  const ref = doc(db, 'meta', 'app');
  await setDoc(ref, meta);
}

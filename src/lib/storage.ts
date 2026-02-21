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
  arrayUnion,
  arrayRemove,
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

export async function sendFriendRequest(senderUsername: string, receiverUsername: string): Promise<void> {
  if (senderUsername === receiverUsername) return;
  const senderRef = doc(db, 'users', senderUsername);
  const receiverRef = doc(db, 'users', receiverUsername);
  const [senderSnap, receiverSnap] = await Promise.all([getDoc(senderRef), getDoc(receiverRef)]);
  if (!senderSnap.exists() || !receiverSnap.exists()) return;
  const sender = senderSnap.data() as User;
  if (
    (sender.friends || []).includes(receiverUsername) ||
    (sender.friendRequestsSent || []).includes(receiverUsername)
  ) return;
  await Promise.all([
    updateDoc(senderRef, { friendRequestsSent: arrayUnion(receiverUsername) }),
    updateDoc(receiverRef, { friendRequestsReceived: arrayUnion(senderUsername) }),
  ]);
}

export async function cancelFriendRequest(senderUsername: string, receiverUsername: string): Promise<void> {
  const senderRef = doc(db, 'users', senderUsername);
  const receiverRef = doc(db, 'users', receiverUsername);
  await Promise.all([
    updateDoc(senderRef, { friendRequestsSent: arrayRemove(receiverUsername) }),
    updateDoc(receiverRef, { friendRequestsReceived: arrayRemove(senderUsername) }),
  ]);
}

export async function acceptFriendRequest(acceptorUsername: string, requesterUsername: string): Promise<void> {
  const acceptorRef = doc(db, 'users', acceptorUsername);
  const requesterRef = doc(db, 'users', requesterUsername);
  await Promise.all([
    updateDoc(acceptorRef, {
      friendRequestsReceived: arrayRemove(requesterUsername),
      friends: arrayUnion(requesterUsername),
    }),
    updateDoc(requesterRef, {
      friendRequestsSent: arrayRemove(acceptorUsername),
      friends: arrayUnion(acceptorUsername),
    }),
  ]);
}

export async function rejectFriendRequest(rejectorUsername: string, requesterUsername: string): Promise<void> {
  const rejectorRef = doc(db, 'users', rejectorUsername);
  const requesterRef = doc(db, 'users', requesterUsername);
  await Promise.all([
    updateDoc(rejectorRef, { friendRequestsReceived: arrayRemove(requesterUsername) }),
    updateDoc(requesterRef, { friendRequestsSent: arrayRemove(rejectorUsername) }),
  ]);
}

export async function removeFriend(currentUsername: string, otherUsername: string): Promise<void> {
  const currentRef = doc(db, 'users', currentUsername);
  const otherRef = doc(db, 'users', otherUsername);
  await Promise.all([
    updateDoc(currentRef, { friends: arrayRemove(otherUsername) }),
    updateDoc(otherRef, { friends: arrayRemove(currentUsername) }),
  ]);
}

export async function getFriends(username: string): Promise<User[]> {
  const snap = await getDoc(doc(db, 'users', username));
  if (!snap.exists()) return [];
  const user = snap.data() as User;
  const friends = user.friends || [];
  if (friends.length === 0) return [];
  const users = await Promise.all(friends.map((u) => getDoc(doc(db, 'users', u))));
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

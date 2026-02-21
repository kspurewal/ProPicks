'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import { getUsers, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } from '@/lib/storage';
import { User } from '@/lib/types';

export default function FriendsPage() {
  const { username, user, refresh } = useUser();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers().then((data) => {
      setAllUsers(data);
      setLoading(false);
    });
  }, []);

  const friends = user?.friends || [];
  const requestsReceived = user?.friendRequestsReceived || [];
  const requestsSent = user?.friendRequestsSent || [];

  const searchResults = search.trim().length >= 2
    ? allUsers.filter(
        (u) => u.username !== username &&
        u.username.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10)
    : [];

  const friendUsers = allUsers
    .filter((u) => friends.includes(u.username))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const pendingRequesters = allUsers.filter((u) => requestsReceived.includes(u.username));

  async function handleSendRequest(target: string) {
    if (!username) return;
    setActionLoading(target);
    try {
      await sendFriendRequest(username, target);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, friendRequestsSent: [...(u.friendRequestsSent || []), target] };
          if (u.username === target) return { ...u, friendRequestsReceived: [...(u.friendRequestsReceived || []), username] };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelRequest(target: string) {
    if (!username) return;
    setActionLoading(target);
    try {
      await cancelFriendRequest(username, target);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, friendRequestsSent: (u.friendRequestsSent || []).filter((f) => f !== target) };
          if (u.username === target) return { ...u, friendRequestsReceived: (u.friendRequestsReceived || []).filter((f) => f !== username) };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(requester: string) {
    if (!username) return;
    setActionLoading(requester);
    try {
      await acceptFriendRequest(username, requester);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return {
            ...u,
            friendRequestsReceived: (u.friendRequestsReceived || []).filter((f) => f !== requester),
            friends: [...(u.friends || []), requester],
          };
          if (u.username === requester) return {
            ...u,
            friendRequestsSent: (u.friendRequestsSent || []).filter((f) => f !== username),
            friends: [...(u.friends || []), username],
          };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(requester: string) {
    if (!username) return;
    setActionLoading(requester);
    try {
      await rejectFriendRequest(username, requester);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, friendRequestsReceived: (u.friendRequestsReceived || []).filter((f) => f !== requester) };
          if (u.username === requester) return { ...u, friendRequestsSent: (u.friendRequestsSent || []).filter((f) => f !== username) };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveFriend(target: string) {
    if (!username) return;
    setActionLoading(target);
    try {
      await removeFriend(username, target);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, friends: (u.friends || []).filter((f) => f !== target) };
          if (u.username === target) return { ...u, friends: (u.friends || []).filter((f) => f !== username) };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  function getButtonState(targetUsername: string): 'friend' | 'pending_sent' | 'pending_received' | 'none' {
    if (friends.includes(targetUsername)) return 'friend';
    if (requestsSent.includes(targetUsername)) return 'pending_sent';
    if (requestsReceived.includes(targetUsername)) return 'pending_received';
    return 'none';
  }

  if (!username) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-text-secondary">Sign up to use the friends feature</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Friends</h1>

      {/* Stats */}
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-accent-green">{friends.length}</p>
          <p className="text-sm text-text-secondary">Friends</p>
        </div>
        {requestsReceived.length > 0 && (
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-green">{requestsReceived.length}</p>
            <p className="text-sm text-text-secondary">Pending Requests</p>
          </div>
        )}
      </div>

      {/* Friend Requests */}
      {pendingRequesters.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Friend Requests
            <span className="ml-2 text-xs bg-accent-green text-white font-bold rounded-full px-2 py-0.5">
              {pendingRequesters.length}
            </span>
          </h2>
          <div className="space-y-2">
            {pendingRequesters.map((u) => (
              <div key={u.username} className="flex items-center justify-between bg-bg-card border border-white/5 rounded-lg px-4 py-3">
                <div>
                  <Link href={`/profile/view?username=${u.username}`} className="font-medium text-text-primary hover:text-accent-green transition">
                    {u.username}
                  </Link>
                  <p className="text-xs text-text-secondary">{u.totalPoints} pts</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(u.username)}
                    disabled={actionLoading === u.username}
                    className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 bg-accent-green text-white hover:bg-accent-green-hover"
                  >
                    {actionLoading === u.username ? '...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleReject(u.username)}
                    disabled={actionLoading === u.username}
                    className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Find Users</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username..."
          className="w-full bg-bg-card border border-white/10 rounded-lg px-4 py-2 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent-green"
        />
        {search.trim().length >= 2 && (
          <div className="mt-2 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-text-secondary text-sm px-1">No users found</p>
            ) : (
              searchResults.map((u) => {
                const state = getButtonState(u.username);
                const isLoading = actionLoading === u.username;
                return (
                  <div key={u.username} className="flex items-center justify-between bg-bg-card border border-white/5 rounded-lg px-4 py-3">
                    <div>
                      <Link href={`/profile/view?username=${u.username}`} className="font-medium text-text-primary hover:text-accent-green transition">
                        {u.username}
                      </Link>
                      <p className="text-xs text-text-secondary">{u.totalPoints} pts</p>
                    </div>
                    {state === 'friend' && (
                      <button
                        onClick={() => handleRemoveFriend(u.username)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 group bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400"
                      >
                        {isLoading ? '...' : <><span className="group-hover:hidden">Friends</span><span className="hidden group-hover:inline">Unfriend</span></>}
                      </button>
                    )}
                    {state === 'pending_sent' && (
                      <button
                        onClick={() => handleCancelRequest(u.username)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400"
                      >
                        {isLoading ? '...' : 'Pending'}
                      </button>
                    )}
                    {state === 'pending_received' && (
                      <button
                        onClick={() => handleAccept(u.username)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 bg-accent-green text-white hover:bg-accent-green-hover"
                      >
                        {isLoading ? '...' : 'Accept'}
                      </button>
                    )}
                    {state === 'none' && (
                      <button
                        onClick={() => handleSendRequest(u.username)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 bg-accent-green text-white hover:bg-accent-green-hover"
                      >
                        {isLoading ? '...' : 'Add Friend'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Friends Leaderboard */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Friends Leaderboard</h2>
        {friendUsers.length === 0 ? (
          <p className="text-text-secondary text-sm">Add friends to see them here.</p>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-text-secondary px-4 py-2">#</th>
                  <th className="text-left text-text-secondary px-4 py-2">User</th>
                  <th className="text-left text-text-secondary px-4 py-2">Points</th>
                  <th className="text-left text-text-secondary px-4 py-2">Streak</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {friendUsers.map((u, i) => (
                  <tr key={u.username} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-text-secondary">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/profile/view?username=${u.username}`} className="text-text-primary hover:text-accent-green transition font-medium">
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-accent-gold font-semibold">{u.totalPoints}</td>
                    <td className="px-4 py-3 text-streak-fire">{u.currentStreak > 0 ? `${u.currentStreak}🔥` : '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveFriend(u.username)}
                        disabled={actionLoading === u.username}
                        className="px-2 py-1 text-xs rounded font-semibold transition disabled:opacity-50 text-text-secondary hover:text-red-400"
                      >
                        {actionLoading === u.username ? '...' : 'Unfriend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

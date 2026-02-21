'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import { getUsers, followUser, unfollowUser } from '@/lib/storage';
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

  const following = user?.following || [];
  const followers = user?.followers || [];

  const searchResults = search.trim().length >= 2
    ? allUsers.filter(
        (u) => u.username !== username &&
        u.username.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10)
    : [];

  const followingUsers = allUsers
    .filter((u) => following.includes(u.username))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  async function handleFollow(target: string) {
    if (!username) return;
    setActionLoading(target);
    try {
      await followUser(username, target);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, following: [...(u.following || []), target] };
          if (u.username === target) return { ...u, followers: [...(u.followers || []), username] };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnfollow(target: string) {
    if (!username) return;
    setActionLoading(target);
    try {
      await unfollowUser(username, target);
      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.username === username) return { ...u, following: (u.following || []).filter((f) => f !== target) };
          if (u.username === target) return { ...u, followers: (u.followers || []).filter((f) => f !== username) };
          return u;
        })
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
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
          <p className="text-2xl font-bold text-accent-green">{following.length}</p>
          <p className="text-sm text-text-secondary">Following</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-accent-green">{followers.length}</p>
          <p className="text-sm text-text-secondary">Followers</p>
        </div>
      </div>

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
                const isFollowing = following.includes(u.username);
                return (
                  <div key={u.username} className="flex items-center justify-between bg-bg-card border border-white/5 rounded-lg px-4 py-3">
                    <div>
                      <Link href={`/profile/view?username=${u.username}`} className="font-medium text-text-primary hover:text-accent-green transition">
                        {u.username}
                      </Link>
                      <p className="text-xs text-text-secondary">{u.totalPoints} pts</p>
                    </div>
                    <button
                      onClick={() => isFollowing ? handleUnfollow(u.username) : handleFollow(u.username)}
                      disabled={actionLoading === u.username}
                      className={`px-3 py-1 text-xs rounded font-semibold transition disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-accent-green text-white hover:bg-accent-green-hover'
                      }`}
                    >
                      {actionLoading === u.username ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
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
        {followingUsers.length === 0 ? (
          <p className="text-text-secondary text-sm">Follow some users to see them here.</p>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-text-secondary px-4 py-2">#</th>
                  <th className="text-left text-text-secondary px-4 py-2">User</th>
                  <th className="text-left text-text-secondary px-4 py-2">Points</th>
                  <th className="text-left text-text-secondary px-4 py-2">Streak</th>
                </tr>
              </thead>
              <tbody>
                {followingUsers.map((u, i) => (
                  <tr key={u.username} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-text-secondary">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/profile/view?username=${u.username}`} className="text-text-primary hover:text-accent-green transition font-medium">
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-accent-gold font-semibold">{u.totalPoints}</td>
                    <td className="px-4 py-3 text-streak-fire">{u.currentStreak > 0 ? `${u.currentStreak}🔥` : '—'}</td>
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

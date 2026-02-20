'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/components/UserProvider';
import { getUsers, banUser, unbanUser } from '@/lib/storage';
import { User } from '@/lib/types';

const ADMIN_USERNAME = 'Krish_Purewal7';

export default function AdminPage() {
  const { username, loading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (username !== ADMIN_USERNAME) {
      setUsersLoading(false);
      return;
    }
    getUsers().then((data) => {
      setUsers(data.sort((a, b) => a.username.localeCompare(b.username)));
      setUsersLoading(false);
    });
  }, [username]);

  async function handleBan(target: string) {
    setActionLoading(target);
    try {
      await banUser(target);
      setUsers((prev) => prev.map((u) => u.username === target ? { ...u, isBanned: true } : u));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnban(target: string) {
    setActionLoading(target);
    try {
      await unbanUser(target);
      setUsers((prev) => prev.map((u) => u.username === target ? { ...u, isBanned: false } : u));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (username !== ADMIN_USERNAME) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-lg font-semibold">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 px-4 py-3">Username</th>
              <th className="text-left text-gray-400 px-4 py-3">Status</th>
              <th className="text-left text-gray-400 px-4 py-3">Points</th>
              <th className="text-left text-gray-400 px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-b border-gray-800 last:border-0">
                <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                <td className="px-4 py-3">
                  {u.isBanned
                    ? <span className="text-red-400">Banned</span>
                    : <span className="text-green-400">Active</span>}
                </td>
                <td className="px-4 py-3 text-gray-300">{u.totalPoints}</td>
                <td className="px-4 py-3">
                  {u.username === ADMIN_USERNAME ? (
                    <span className="text-gray-500 text-xs">—</span>
                  ) : u.isBanned ? (
                    <button
                      onClick={() => handleUnban(u.username)}
                      disabled={actionLoading === u.username}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded disabled:opacity-50"
                    >
                      {actionLoading === u.username ? '...' : 'Unban'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBan(u.username)}
                      disabled={actionLoading === u.username}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded disabled:opacity-50"
                    >
                      {actionLoading === u.username ? '...' : 'Ban'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

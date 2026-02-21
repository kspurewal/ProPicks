'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useUser } from '@/components/UserProvider';
import { useTheme } from '@/components/ThemeProvider';
import UsernameModal from './UsernameModal';
import OnboardingTutorial, { useShouldShowTutorial } from './OnboardingTutorial';

export default function Navbar() {
  const { username, user, isLoggedIn, login, logout, savePreferences } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { show: showTutorial, setShow: setShowTutorial } = useShouldShowTutorial();

  return (
    <>
      <nav className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur border-b-2 border-accent-green">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-accent-green">ProPicks</span>
            <span className="text-xs font-semibold bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
              SPORTS
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition">
              Picks
            </Link>
            <Link href="/feed" className="text-sm text-text-secondary hover:text-text-primary transition">
              Feed
            </Link>
            <Link href="/ept" className="text-sm text-text-secondary hover:text-text-primary transition">
              EPT Rankings
            </Link>
            <Link href="/leaderboard" className="text-sm text-text-secondary hover:text-text-primary transition">
              Leaderboard
            </Link>
            {isLoggedIn && (
              <>
                <Link href="/friends" className="text-sm text-text-secondary hover:text-text-primary transition">
                  Friends
                </Link>
                <Link href="/profile" className="text-sm text-text-secondary hover:text-text-primary transition">
                  Profile
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-text-secondary hover:text-text-primary transition p-1"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {user && user.currentStreak > 0 && (
                  <span className="text-streak-fire text-sm font-semibold">
                    {user.currentStreak}
                  </span>
                )}
                <span className="text-sm font-medium text-text-primary">{username}</span>
                <span className="text-xs text-accent-gold font-semibold">
                  {user?.totalPoints || 0} pts
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="text-sm font-semibold bg-accent-green hover:bg-accent-green-hover text-white px-4 py-1.5 rounded-lg transition"
              >
                Sign Up
              </button>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-text-secondary hover:text-text-primary p-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3">
            <Link href="/" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
              Picks
            </Link>
            <Link href="/feed" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
              Feed
            </Link>
            <Link href="/ept" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
              EPT Rankings
            </Link>
            <Link href="/leaderboard" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
              Leaderboard
            </Link>
            {isLoggedIn && (
              <>
                <Link href="/friends" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
                  Friends
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="text-sm text-text-secondary">
                  Profile
                </Link>
                <button onClick={logout} className="text-sm text-red-400 text-left">
                  Log Out
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {showTutorial && isLoggedIn && (
        <OnboardingTutorial onDone={() => setShowTutorial(false)} />
      )}

      {showModal && (
        <UsernameModal
          onSubmit={async (name) => {
            await login(name);
          }}
          onClose={() => setShowModal(false)}
          onPreferences={async (leagues, teams) => {
            await savePreferences(leagues, teams);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

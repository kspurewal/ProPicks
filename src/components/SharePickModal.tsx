'use client';

import { useState } from 'react';
import { Pick, Sport } from '@/lib/types';

interface Props {
  pick: Pick;
  username: string;
  onClose: () => void;
}

const SPORT_LABELS: Record<Sport, string> = { nba: 'NBA', mlb: 'MLB', nfl: 'NFL', nhl: 'NHL' };

export default function SharePickModal({ pick, username, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const profileUrl = `https://kspurewal.github.io/ProPicks/profile/view?username=${encodeURIComponent(username)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = profileUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const resultColor =
    pick.result === 'correct' ? 'text-green-400' :
    pick.result === 'incorrect' ? 'text-red-400' :
    'text-gray-400';

  const resultLabel =
    pick.result === 'correct' ? `+${pick.pointsEarned ?? 0} pts` :
    pick.result === 'incorrect' ? 'Miss' :
    'Pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Share Pick</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pick card */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
              {pick.sport ? SPORT_LABELS[pick.sport] : 'Pick'}
            </span>
            <span className={`text-sm font-bold ${resultColor}`}>{resultLabel}</span>
          </div>
          <p className="text-white font-semibold text-sm">
            Picked team ID: <span className="text-accent-green font-bold">{pick.pickedTeamId}</span>
          </p>
          <p className="text-xs text-gray-400">{pick.date} · {pick.confidence ? '★'.repeat(pick.confidence) : ''}</p>
          <p className="text-xs text-gray-500">by <span className="text-white font-medium">{username}</span></p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2.5 bg-accent-green hover:bg-accent-green-hover text-white text-sm font-semibold rounded-lg transition"
        >
          {copied ? 'Copied!' : 'Copy Profile Link'}
        </button>
      </div>
    </div>
  );
}

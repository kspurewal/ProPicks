'use client';

import { useState, useEffect } from 'react';

const TUTORIAL_KEY = 'propicks_tutorial_done';

const STEPS = [
  {
    title: 'Make your first pick',
    description: 'Go to Picks and choose a team to win today\'s game. You get 3 picks per day.',
    link: '/',
    linkLabel: 'Go to Picks',
  },
  {
    title: 'Check the Feed',
    description: 'The Feed shows trending picks, big games, player highlights, and news.',
    link: '/feed',
    linkLabel: 'Open Feed',
  },
  {
    title: 'Browse EPT Rankings',
    description: 'EPT Rankings shows elite player stats across NBA, NFL, MLB, and NHL.',
    link: '/ept',
    linkLabel: 'View Rankings',
  },
  {
    title: 'Climb the Leaderboard',
    description: 'Correct picks earn points. See how you stack up against everyone else.',
    link: '/leaderboard',
    linkLabel: 'See Leaderboard',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingTutorial({ onDone }: Props) {
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    onDone();
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-6 sm:pb-0">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-accent-green' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{current.title}</h2>
          <p className="text-sm text-gray-400 mt-1">{current.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={current.link}
            onClick={finish}
            className="flex-1 text-center py-2 bg-accent-green hover:bg-accent-green-hover text-white text-sm font-semibold rounded-lg transition"
          >
            {current.linkLabel}
          </a>
          <button
            onClick={handleNext}
            className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg transition"
          >
            {step < STEPS.length - 1 ? 'Next' : 'Done'}
          </button>
        </div>

        <button onClick={finish} className="w-full text-xs text-gray-500 hover:text-gray-400 transition">
          Skip tutorial
        </button>
      </div>
    </div>
  );
}

export function useShouldShowTutorial() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) setShow(true);
  }, []);
  return { show, setShow };
}

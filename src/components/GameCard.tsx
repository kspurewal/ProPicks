'use client';

import Link from 'next/link';
import { Game, Pick } from '@/lib/types';
import { formatTime } from '@/lib/utils';

interface Props {
  game: Game;
  pick?: Pick;
  onPick?: (teamId: string) => void | Promise<void>;
  isLoggedIn: boolean;
}

export default function GameCard({ game, pick }: Props) {
  const isFinal = game.status === 'final';
  const isLive = game.status === 'in_progress';

  const pickedTeamId = pick?.pickedTeamId;
  const isCorrect = pick?.result === 'correct';
  const isIncorrect = pick?.result === 'incorrect';

  let cardClass = 'bg-bg-card border border-white/5 rounded-xl p-4 transition-all block';
  if (isCorrect) cardClass += ' card-glow-correct border-correct/30';
  else if (isIncorrect) cardClass += ' card-glow-incorrect border-incorrect/30';
  else if (pickedTeamId) cardClass += ' card-glow-picked border-accent-green/20';
  else cardClass += ' hover:bg-bg-card-hover';

  function TeamSide({ team, side }: { team: typeof game.homeTeam; side: 'home' | 'away' }) {
    const isPicked = pickedTeamId === team.id;
    const score = side === 'home' ? game.homeScore : game.awayScore;
    const isWinner = isFinal && score !== null && (
      side === 'home' ? (game.homeScore || 0) > (game.awayScore || 0) : (game.awayScore || 0) > (game.homeScore || 0)
    );

    let cls = 'flex-1 flex flex-col items-center gap-2 p-3 rounded-lg ';
    if (isFinal) {
      if (isPicked && isCorrect) cls += 'bg-correct/10 border border-correct/30';
      else if (isPicked && isIncorrect) cls += 'bg-incorrect/10 border border-incorrect/30';
      else if (isWinner) cls += 'bg-white/5 border border-white/10';
      else cls += 'opacity-50 border border-transparent';
    } else if (isPicked) {
      cls += 'bg-accent-green/10 border border-accent-green/30';
    } else {
      cls += 'border border-transparent';
    }

    return (
      <div className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt={team.abbreviation} className="w-12 h-12 object-contain" />
        <span className="font-bold text-sm text-text-primary">{team.abbreviation}</span>
        <span className="text-xs text-text-secondary">{team.record}</span>
        {(isLive || isFinal) && score !== null && (
          <span className={`text-lg font-bold ${isWinner ? 'text-text-primary' : 'text-text-secondary'}`}>
            {score}
          </span>
        )}
        {isPicked && !isFinal && (
          <span className="text-xs text-accent-green font-semibold">YOUR PICK</span>
        )}
        {isPicked && isCorrect && (
          <span className="text-xs text-correct font-semibold">+{pick?.pointsEarned || 0} pts</span>
        )}
        {isPicked && isIncorrect && (
          <span className="text-xs text-incorrect font-semibold">MISS</span>
        )}
      </div>
    );
  }

  return (
    <Link href={`/game/${game.id}?sport=${game.sport}&date=${game.date}`} className={cardClass}>
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs text-text-secondary">
          {isFinal ? 'FINAL' : isLive ? 'LIVE' : formatTime(game.startTime)}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-semibold">LIVE</span>
            </span>
          )}
          <span className="text-xs text-text-secondary">View Matchup &rsaquo;</span>
        </div>
      </div>

      <div className="flex gap-3">
        <TeamSide team={game.awayTeam} side="away" />
        <div className="flex items-center">
          <span className="text-text-secondary text-xs font-semibold">VS</span>
        </div>
        <TeamSide team={game.homeTeam} side="home" />
      </div>
    </Link>
  );
}

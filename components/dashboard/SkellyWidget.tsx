'use client';

import { SkellyMascot, type SkellyMood } from './SkellyMascot';

type Props = {
  streak: number;
  todayComplete: boolean;
  userName?: string;
  lastScore?: number | null; // 0-100, from most recent session
};

function getMood(streak: number, todayComplete: boolean, lastScore?: number | null): SkellyMood {
  // They just got a great score today
  if (lastScore !== null && lastScore !== undefined && lastScore >= 80 && todayComplete) return 'celebrating';
  // Today's study is done and streak is alive
  if (todayComplete && streak > 0) return 'happy';
  // Streak is dead — they haven't studied in days
  if (streak === 0) return 'disappointed';
  // Streak alive but haven't studied today yet
  if (!todayComplete && streak > 0) return 'encouraging';
  return 'idle';
}

export function SkellyWidget({ streak, todayComplete, userName, lastScore }: Props) {
  const mood = getMood(streak, todayComplete, lastScore);
  return (
    <SkellyMascot
      mood={mood}
      streak={streak}
      todayComplete={todayComplete}
      userName={userName}
    />
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { StreakCelebration } from './StreakCelebration';

export function StreakCelebrationOverlay({
  streakCount,
  todayComplete,
}: {
  streakCount: number;
  todayComplete: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!todayComplete || streakCount < 2) return;

    // Only show once per day
    const key = `streak_celebrated_${new Date().toISOString().split('T')[0]}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');

    // Small delay so the page loads first
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, [todayComplete, streakCount]);

  useEffect(() => {
    if (!show) return;
    // Auto-dismiss after 2.8s
    const t = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <div
      onClick={() => setShow(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'pointer' }}
    >
      <Player
        component={StreakCelebration}
        inputProps={{ streakCount }}
        durationInFrames={75}
        fps={30}
        compositionWidth={600}
        compositionHeight={400}
        style={{ width: '100%', height: '100%' }}
        autoPlay
      />
    </div>
  );
}

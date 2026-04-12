'use client';

import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { ResultCelebration } from './ResultCelebration';

interface Props {
  score: number;
  tier: string;
  correctCount: number;
  totalAnswered: number;
  onDone: () => void;
}

export function ResultPlayer({ score, tier, correctCount, totalAnswered, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after animation (~2.2s)
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(onDone, 300); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <Player
        component={ResultCelebration}
        inputProps={{ score, tier, correctCount, totalAnswered }}
        durationInFrames={65}
        fps={30}
        compositionWidth={600}
        compositionHeight={400}
        style={{ width: '100%', height: '100%' }}
        autoPlay
      />
    </div>
  );
}

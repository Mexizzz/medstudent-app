'use client';

import { Player } from '@remotion/player';
import { SkellyComposition } from './SkellyComposition';

export function SkellyPlayer({ score, size = 120 }: { score: number; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
      <Player
        component={SkellyComposition}
        inputProps={{ score }}
        durationInFrames={99999}
        fps={30}
        compositionWidth={120}
        compositionHeight={120}
        style={{ width: '100%', height: '100%' }}
        autoPlay
        loop
      />
    </div>
  );
}

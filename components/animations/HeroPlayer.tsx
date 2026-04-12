'use client';

import { Player } from '@remotion/player';
import { HeroAnimation } from './HeroAnimation';

export function HeroPlayer() {
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 border border-slate-200/60 dark:border-slate-700/60">
      <Player
        component={HeroAnimation}
        durationInFrames={150}
        fps={30}
        compositionWidth={620}
        compositionHeight={320}
        style={{ width: '100%' }}
        autoPlay
        loop
      />
    </div>
  );
}

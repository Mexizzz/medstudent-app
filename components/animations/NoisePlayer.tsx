'use client';

import { Player } from '@remotion/player';
import { HeroNoiseBackground, DashboardNoiseBackground } from './NoiseBackground';

export function HeroNoisePlayer() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
    }}>
      <Player
        component={HeroNoiseBackground}
        durationInFrames={99999}
        fps={24}
        compositionWidth={1200}
        compositionHeight={500}
        style={{ width: '100%', height: '100%' }}
        autoPlay
        loop
      />
    </div>
  );
}

export function DashboardNoisePlayer() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <Player
        component={DashboardNoiseBackground}
        durationInFrames={99999}
        fps={20}
        compositionWidth={1000}
        compositionHeight={600}
        style={{ width: '100%', height: '100%' }}
        autoPlay
        loop
      />
    </div>
  );
}

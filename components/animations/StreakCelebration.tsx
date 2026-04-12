'use client';

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();

function FireParticle({ x, delay, size, color }: { x: number; delay: number; size: number; color: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 6, stiffness: 40, mass: 0.5 } });
  const opacity = interpolate(frame - delay, [0, 5, 45, 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ty = interpolate(progress, [0, 1], [0, -260]);
  const tx = interpolate(progress, [0, 1], [0, x]);
  const scale = interpolate(frame - delay, [0, 15, 50], [0.4, 1.2, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      bottom: '35%',
      fontSize: size,
      opacity,
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      filter: `drop-shadow(0 0 8px ${color})`,
    }}>
      🔥
    </div>
  );
}

const FIRES = [
  { x: 0, delay: 0, size: 48, color: '#f97316' },
  { x: -70, delay: 8, size: 36, color: '#f59e0b' },
  { x: 70, delay: 5, size: 40, color: '#ef4444' },
  { x: -140, delay: 14, size: 28, color: '#fbbf24' },
  { x: 140, delay: 11, size: 32, color: '#f97316' },
  { x: -35, delay: 18, size: 22, color: '#f59e0b' },
  { x: 35, delay: 15, size: 26, color: '#ef4444' },
];

export function StreakCelebration({ streakCount }: { streakCount: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 10, 55, 70], [0, 0.92, 0.92, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const numberProgress = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 80 } });
  const numberScale = interpolate(numberProgress, [0, 1], [0.3, 1]);
  const numberOpacity = interpolate(frame, [15, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const labelOpacity = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelY = interpolate(frame, [30, 42], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: `rgba(15, 10, 0, ${bgOpacity})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily,
    }}>
      {FIRES.map((f, i) => <FireParticle key={i} {...f} />)}

      {/* Big streak number */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity: numberOpacity,
        transform: `scale(${numberScale})`,
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🔥</div>
        <div style={{ fontSize: 100, fontWeight: 900, color: '#f97316', lineHeight: 1, textShadow: '0 0 60px #f9731680' }}>
          {streakCount}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.1em', opacity: labelOpacity, transform: `translateY(${labelY}px)` }}>
          DAY STREAK!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8, opacity: labelOpacity }}>
          Keep the fire alive 🔥
        </div>
      </div>
    </AbsoluteFill>
  );
}

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

function Particle({ x, y, color, delay, size }: { x: number; y: number; color: string; delay: number; size: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 8, stiffness: 80, mass: 0.6 } });
  const opacity = interpolate(frame - delay, [0, 5, 40, 55], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ty = interpolate(progress, [0, 1], [0, -y]);
  const tx = interpolate(progress, [0, 1], [0, x]);
  const rotate = interpolate(frame - delay, [0, 60], [0, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      top: '55%',
      width: size,
      height: size,
      borderRadius: size / 3,
      background: color,
      opacity,
      transform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`,
    }} />
  );
}

const PARTICLES = [
  { x: -120, y: 180, color: '#3b82f6', delay: 5, size: 10 },
  { x: 80, y: 200, color: '#10b981', delay: 8, size: 8 },
  { x: -60, y: 150, color: '#f59e0b', delay: 3, size: 12 },
  { x: 140, y: 160, color: '#8b5cf6', delay: 6, size: 9 },
  { x: -180, y: 120, color: '#ef4444', delay: 10, size: 7 },
  { x: 200, y: 130, color: '#06b6d4', delay: 4, size: 11 },
  { x: -40, y: 220, color: '#f97316', delay: 7, size: 8 },
  { x: 100, y: 190, color: '#ec4899', delay: 2, size: 10 },
  { x: -150, y: 170, color: '#84cc16', delay: 9, size: 9 },
  { x: 60, y: 210, color: '#fbbf24', delay: 5, size: 7 },
  { x: -90, y: 140, color: '#a78bfa', delay: 11, size: 11 },
  { x: 170, y: 150, color: '#34d399', delay: 6, size: 8 },
];

export function ResultCelebration({
  score,
  tier,
  correctCount,
  totalAnswered,
}: {
  score: number;
  tier: string;
  correctCount: number;
  totalAnswered: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const scoreProgress = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 60 } });
  const scoreValue = Math.round(interpolate(scoreProgress, [0, 1], [0, score]));

  const tierOpacity = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tierScale = spring({ frame: frame - 20, fps, config: { damping: 10, stiffness: 120 } });

  const statsOpacity = interpolate(frame, [35, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const scoreColor =
    score === 100 ? '#f59e0b' :
    score >= 90 ? '#10b981' :
    score >= 75 ? '#3b82f6' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444';

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
      opacity: bgOpacity,
      fontFamily,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Particles */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Score number */}
      <div style={{
        fontSize: 96,
        fontWeight: 900,
        color: scoreColor,
        lineHeight: 1,
        textShadow: `0 0 40px ${scoreColor}80`,
        letterSpacing: '-4px',
      }}>
        {scoreValue}%
      </div>

      {/* Tier label */}
      <div style={{
        marginTop: 16,
        fontSize: 24,
        fontWeight: 800,
        color: 'white',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        opacity: tierOpacity,
        transform: `scale(${interpolate(tierScale, [0, 1], [0.6, 1])})`,
      }}>
        {tier}
      </div>

      {/* Correct / Total */}
      <div style={{
        marginTop: 20,
        fontSize: 18,
        color: 'rgba(255,255,255,0.6)',
        opacity: statsOpacity,
      }}>
        {correctCount} / {totalAnswered} correct
      </div>
    </AbsoluteFill>
  );
}

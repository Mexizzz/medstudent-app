'use client';

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type DuckState = 'idle' | 'reading' | 'celebrate' | 'sad' | 'alert';

interface Props {
  state: DuckState;
  primaryColor: string;
  bgColor: string;
  streak?: number;
}

function Duck({
  bodyY = 0,
  wingAngle = 0,
  headTilt = 0,
  eyeSquint = 1,
  mouthOpen = 0,
  primaryColor,
  bookVisible = false,
  capBounce = 0,
  streak = 0,
}: {
  bodyY?: number;
  wingAngle?: number;
  headTilt?: number;
  eyeSquint?: number;
  mouthOpen?: number;
  primaryColor: string;
  bookVisible?: boolean;
  capBounce?: number;
  streak?: number;
}) {
  const duckYellow = '#F5C842';
  const duckDark = '#E8A800';
  const beakColor = '#FF8C00';
  const white = '#FFFFFF';
  const cx = 80;
  const cy = 90;

  return (
    <g transform={`translate(0,${bodyY})`}>
      {/* Shadow */}
      <ellipse cx={cx} cy={165} rx={28} ry={6}
        fill="rgba(0,0,0,0.15)"
        transform={`scale(${1 + Math.abs(bodyY) * 0.008}, 1)`}
      />

      {/* Body */}
      <ellipse cx={cx} cy={cy + 20} rx={34} ry={28}
        fill={duckYellow}
        stroke={duckDark} strokeWidth={1.5}
      />

      {/* Left wing */}
      <ellipse cx={cx - 26} cy={cy + 22}
        rx={14} ry={20}
        fill={duckDark}
        stroke={duckDark} strokeWidth={1}
        transform={`rotate(${-15 + wingAngle}, ${cx - 26}, ${cy + 22})`}
      />

      {/* Right wing */}
      <ellipse cx={cx + 26} cy={cy + 22}
        rx={14} ry={20}
        fill={duckDark}
        stroke={duckDark} strokeWidth={1}
        transform={`rotate(${15 - wingAngle}, ${cx + 26}, ${cy + 22})`}
      />

      {/* Feet */}
      <ellipse cx={cx - 14} cy={cy + 48} rx={10} ry={5}
        fill={beakColor}
        transform="rotate(-10, 66, 138)"
      />
      <ellipse cx={cx + 10} cy={cy + 49} rx={10} ry={5}
        fill={beakColor}
        transform="rotate(10, 90, 139)"
      />

      {/* Neck */}
      <ellipse cx={cx} cy={cy - 4} rx={14} ry={12}
        fill={duckYellow}
      />

      {/* Head */}
      <circle cx={cx} cy={cy - 22} r={24}
        fill={duckYellow}
        stroke={duckDark} strokeWidth={1.5}
        transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}
      />

      {/* Eye */}
      <g transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}>
        <ellipse cx={cx + 10} cy={cy - 26}
          rx={6} ry={6 * eyeSquint}
          fill={white}
        />
        <circle cx={cx + 11} cy={cy - 26}
          r={3.5}
          fill="#1a1a2e"
        />
        <circle cx={cx + 12} cy={cy - 28}
          r={1.2}
          fill={white}
        />
      </g>

      {/* Beak */}
      <g transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}>
        <path
          d={`M ${cx + 22} ${cy - 22} Q ${cx + 34} ${cy - 20} ${cx + 26} ${cy - 16 + mouthOpen}`}
          fill={beakColor}
          stroke="#CC6600" strokeWidth={1}
        />
        <path
          d={`M ${cx + 22} ${cy - 22} Q ${cx + 34} ${cy - 24} ${cx + 26} ${cy - 28 - mouthOpen}`}
          fill={beakColor}
          stroke="#CC6600" strokeWidth={1}
        />
      </g>

      {/* Graduation cap */}
      <g transform={`translate(0, ${capBounce})`}>
        {/* Cap base / mortarboard top */}
        <rect
          x={cx - 22} y={cy - 52}
          width={44} height={8}
          rx={2}
          fill={primaryColor}
          transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}
        />
        {/* Cap crown */}
        <rect
          x={cx - 12} y={cy - 62}
          width={24} height={12}
          rx={2}
          fill={primaryColor}
          transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}
        />
        {/* Tassel */}
        <line
          x1={cx + 18} y1={cy - 52}
          x2={cx + 22} y2={cy - 40}
          stroke={primaryColor} strokeWidth={2} strokeLinecap="round"
          transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}
        />
        <circle cx={cx + 22} cy={cy - 38} r={3} fill={primaryColor}
          transform={`rotate(${headTilt}, ${cx}, ${cy - 22})`}
        />
      </g>

      {/* Scarf (when streak ≥ 7) */}
      {streak >= 7 && (
        <g>
          <path
            d={`M ${cx - 18} ${cy - 6} Q ${cx} ${cy - 2} ${cx + 18} ${cy - 6} L ${cx + 20} ${cy + 2} Q ${cx} ${cy + 6} ${cx - 20} ${cy + 2} Z`}
            fill={streak >= 30 ? '#dc2626' : streak >= 14 ? '#ea580c' : primaryColor}
            stroke={streak >= 30 ? '#991b1b' : streak >= 14 ? '#9a3412' : primaryColor}
            strokeWidth={0.5}
          />
          <rect
            x={cx - 22} y={cy - 2}
            width={4} height={10}
            fill={streak >= 30 ? '#dc2626' : streak >= 14 ? '#ea580c' : primaryColor}
          />
          {/* fringe */}
          {[0,1,2].map(i => (
            <line key={i}
              x1={cx - 22 + i * 1.3} y1={cy + 8}
              x2={cx - 22 + i * 1.3} y2={cy + 11}
              stroke={streak >= 30 ? '#991b1b' : streak >= 14 ? '#9a3412' : primaryColor}
              strokeWidth={0.8}
            />
          ))}
        </g>
      )}

      {/* Book (when reading) */}
      {bookVisible && (
        <g>
          <rect x={cx - 20} y={cy + 30} width={38} height={26} rx={3}
            fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5}
          />
          <line x1={cx - 1} y1={cy + 30} x2={cx - 1} y2={cy + 56}
            stroke="#94a3b8" strokeWidth={1.5}
          />
          {/* Page lines */}
          {[35, 39, 43, 47, 51].map(y => (
            <line key={y} x1={cx - 17} y1={cy + y} x2={cx - 4} y2={cy + y}
              stroke="#cbd5e1" strokeWidth={1}
            />
          ))}
          {[35, 39, 43, 47, 51].map(y => (
            <line key={y} x1={cx + 2} y1={cy + y} x2={cx + 16} y2={cy + y}
              stroke="#cbd5e1" strokeWidth={1}
            />
          ))}
        </g>
      )}
    </g>
  );
}

export function DuckComposition({ state, primaryColor, bgColor, streak = 0 }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let bodyY = 0, wingAngle = 0, headTilt = 0, eyeSquint = 1;
  let mouthOpen = 0, bookVisible = false, capBounce = 0;

  if (state === 'idle') {
    bodyY = Math.sin(t * Math.PI * 1.2) * 6;
    wingAngle = Math.sin(t * Math.PI * 1.2) * 4;
    headTilt = Math.sin(t * Math.PI * 0.8) * 5;
    eyeSquint = frame % 90 < 6 ? 0.15 : 1; // blink every 3s
    capBounce = Math.sin(t * Math.PI * 1.2) * 3;
  }

  if (state === 'reading') {
    bodyY = Math.sin(t * Math.PI * 0.6) * 3;
    headTilt = Math.sin(t * Math.PI * 0.4) * 8;
    eyeSquint = frame % 60 < 4 ? 0.1 : 0.7;
    bookVisible = true;
    wingAngle = -5;
    capBounce = Math.sin(t * Math.PI * 0.6) * 2;
  }

  if (state === 'celebrate') {
    const bounce = spring({ frame, fps, config: { damping: 6, stiffness: 200, mass: 0.5 } });
    bodyY = interpolate(bounce, [0, 1], [0, -30]) + Math.sin(t * Math.PI * 4) * 10;
    wingAngle = Math.sin(t * Math.PI * 5) * 35;
    headTilt = Math.sin(t * Math.PI * 3) * 15;
    mouthOpen = 4;
    eyeSquint = 0.3;
    capBounce = Math.sin(t * Math.PI * 4) * 8 - 5;
  }

  if (state === 'sad') {
    bodyY = Math.sin(t * Math.PI * 0.5) * 2;
    wingAngle = -20;
    headTilt = 15;
    eyeSquint = 0.4;
    capBounce = 4;
  }

  if (state === 'alert') {
    bodyY = Math.sin(t * Math.PI * 3) * 4;
    wingAngle = Math.sin(t * Math.PI * 2) * 10;
    headTilt = Math.sin(t * Math.PI * 2) * 6;
    eyeSquint = 1.1;
    mouthOpen = 2;
    capBounce = Math.sin(t * Math.PI * 3) * 3;
  }

  // Confetti particles for celebrate
  const particles = state === 'celebrate'
    ? [
      { x: -50, dy: 140, color: primaryColor, delay: 0, size: 8 },
      { x: 30, dy: 160, color: '#f59e0b', delay: 3, size: 6 },
      { x: -20, dy: 120, color: '#10b981', delay: 6, size: 10 },
      { x: 60, dy: 150, color: '#ec4899', delay: 2, size: 7 },
      { x: -70, dy: 130, color: '#06b6d4', delay: 5, size: 9 },
      { x: 80, dy: 110, color: '#a78bfa', delay: 4, size: 8 },
    ]
    : [];

  return (
    <AbsoluteFill style={{ background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow under duck */}
      <div style={{
        position: 'absolute',
        width: 120, height: 40,
        borderRadius: '50%',
        bottom: '28%',
        background: `radial-gradient(ellipse, ${primaryColor}30, transparent 70%)`,
        filter: 'blur(12px)',
      }} />

      {/* Confetti */}
      {particles.map((p, i) => {
        const pf = frame - p.delay;
        const progress = spring({ frame: pf, fps, config: { damping: 8, stiffness: 100, mass: 0.5 } });
        const opacity = interpolate(pf, [0, 4, 35, 50], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const ty = interpolate(progress, [0, 1], [0, -p.dy]);
        const tx = interpolate(progress, [0, 1], [0, p.x]);
        const rot = interpolate(pf, [0, 50], [0, 720], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute',
            bottom: '35%', left: '50%',
            width: p.size, height: p.size,
            borderRadius: p.size / 3,
            background: p.color,
            opacity,
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
          }} />
        );
      })}

      <svg width={160} height={185} viewBox="0 0 160 185">
        <Duck
          bodyY={bodyY}
          wingAngle={wingAngle}
          headTilt={headTilt}
          eyeSquint={eyeSquint}
          mouthOpen={mouthOpen}
          primaryColor={primaryColor}
          bookVisible={bookVisible}
          capBounce={capBounce}
          streak={streak}
        />
      </svg>
    </AbsoluteFill>
  );
}

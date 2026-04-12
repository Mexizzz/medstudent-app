'use client';

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();

// ── SVG skeleton parts ────────────────────────────────────────────────────────
interface SkeletonProps {
  // transform values driven by caller
  bodyY: number;
  bodyRotate: number;
  headScale: number;
  leftArmAngle: number;
  rightArmAngle: number;
  leftLegAngle: number;
  rightLegAngle: number;
  color: string;
  eyeScale: number;
}

function Skeleton({
  bodyY, bodyRotate, headScale, leftArmAngle, rightArmAngle,
  leftLegAngle, rightLegAngle, color, eyeScale,
}: SkeletonProps) {
  const cx = 60; // center x
  const headR = 18;
  const neckY = 28;
  const shoulderY = neckY + 8;
  const hipY = shoulderY + 42;
  const armLen = 28;
  const legLen = 36;

  // arm endpoints
  const lArmX = cx + Math.sin((leftArmAngle * Math.PI) / 180) * armLen;
  const lArmY = shoulderY + Math.cos((leftArmAngle * Math.PI) / 180) * armLen;
  const rArmX = cx + Math.sin((rightArmAngle * Math.PI) / 180) * armLen;
  const rArmY = shoulderY + Math.cos((rightArmAngle * Math.PI) / 180) * armLen;

  // leg endpoints
  const lLegX = cx + Math.sin((leftLegAngle * Math.PI) / 180) * legLen;
  const lLegY = hipY + Math.cos((leftLegAngle * Math.PI) / 180) * legLen;
  const rLegX = cx + Math.sin((rightLegAngle * Math.PI) / 180) * legLen;
  const rLegY = hipY + Math.cos((rightLegAngle * Math.PI) / 180) * legLen;

  return (
    <g transform={`translate(0,${bodyY}) rotate(${bodyRotate},${cx},${shoulderY + (hipY - shoulderY) / 2})`}>
      {/* Spine */}
      <line x1={cx} y1={neckY} x2={cx} y2={hipY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Shoulders */}
      <line x1={cx - 18} y1={shoulderY} x2={cx + 18} y2={shoulderY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Arms */}
      <line x1={cx - 18} y1={shoulderY} x2={lArmX} y2={lArmY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={cx + 18} y1={shoulderY} x2={rArmX} y2={rArmY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Hips */}
      <line x1={cx - 12} y1={hipY} x2={cx + 12} y2={hipY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Legs */}
      <line x1={cx - 12} y1={hipY} x2={lLegX - 6} y2={lLegY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={cx + 12} y1={hipY} x2={rLegX + 6} y2={lLegY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Head */}
      <g transform={`scale(${headScale}) translate(${cx * (1 - 1 / headScale)},${(neckY - headR) * (1 - 1 / headScale)})`}>
        <circle cx={cx} cy={neckY - headR} r={headR} fill="none" stroke={color} strokeWidth={3} />
        {/* Eye sockets */}
        <circle cx={cx - 6} cy={neckY - headR - 2} r={3 * eyeScale} fill={color} />
        <circle cx={cx + 6} cy={neckY - headR - 2} r={3 * eyeScale} fill={color} />
        {/* Nose */}
        <line x1={cx} y1={neckY - headR + 2} x2={cx} y2={neckY - headR + 6} stroke={color} strokeWidth={2} strokeLinecap="round" />
        {/* Teeth row */}
        <line x1={cx - 7} y1={neckY - headR + 9} x2={cx + 7} y2={neckY - headR + 9} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <line x1={cx - 3} y1={neckY - headR + 9} x2={cx - 3} y2={neckY - headR + 13} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={cx + 3} y1={neckY - headR + 9} x2={cx + 3} y2={neckY - headR + 13} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    </g>
  );
}

// ── Per-tier animation drivers ────────────────────────────────────────────────
function useSkeletonPose(score: number, frame: number, fps: number) {
  const cycle = frame % fps; // repeating cycle within 1 second
  const t = frame / fps;

  if (score === 100) {
    // Victory spin + jump
    const jump = Math.sin(t * Math.PI * 4) * 18;
    const spin = (frame * 4) % 360;
    return {
      bodyY: jump, bodyRotate: spin > 180 ? spin - 360 : spin,
      leftArmAngle: -110, rightArmAngle: 110,
      leftLegAngle: -30, rightLegAngle: 30,
      headScale: 1 + Math.abs(Math.sin(t * 4)) * 0.15,
      eyeScale: 1,
    };
  }

  if (score >= 90) {
    // Happy bounce + wave
    const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * -20;
    const wave = Math.sin(t * Math.PI * 3) * 40;
    return {
      bodyY: bounce, bodyRotate: 0,
      leftArmAngle: -80, rightArmAngle: 80 + wave,
      leftLegAngle: -20, rightLegAngle: 20,
      headScale: 1 + Math.abs(Math.sin(t * 2.5)) * 0.1,
      eyeScale: 1,
    };
  }

  if (score >= 75) {
    // Thumbs up bob
    const bob = Math.sin(t * Math.PI * 2) * 8;
    return {
      bodyY: bob, bodyRotate: 0,
      leftArmAngle: 20, rightArmAngle: -90,
      leftLegAngle: -15, rightLegAngle: 15,
      headScale: 1,
      eyeScale: 1,
    };
  }

  if (score >= 60) {
    // Neutral slow sway
    const sway = Math.sin(t * Math.PI) * 6;
    return {
      bodyY: sway * 0.5, bodyRotate: Math.sin(t * Math.PI) * 4,
      leftArmAngle: 20, rightArmAngle: -20,
      leftLegAngle: -10, rightLegAngle: 10,
      headScale: 1,
      eyeScale: 1,
    };
  }

  if (score >= 40) {
    // Head shake, arms down sad
    const shake = Math.sin(t * Math.PI * 5) * 10;
    return {
      bodyY: 0, bodyRotate: shake * 0.4,
      leftArmAngle: 30, rightArmAngle: -30,
      leftLegAngle: -8, rightLegAngle: 8,
      headScale: 1,
      eyeScale: 1.3,
    };
  }

  // YIKES — dramatic cry shake
  const shake = Math.sin(t * Math.PI * 8) * 14;
  const slump = Math.sin(t * Math.PI * 0.5) * 5;
  return {
    bodyY: slump, bodyRotate: shake * 0.5,
    leftArmAngle: 55, rightArmAngle: -55,
    leftLegAngle: -5, rightLegAngle: 5,
    headScale: 1 + Math.sin(t * 2) * 0.05,
    eyeScale: 1.6,
  };
}

// ── Tier config ───────────────────────────────────────────────────────────────
function getTierConfig(score: number) {
  if (score === 100) return { color: '#f59e0b', bg: '#1a1200', label: 'PERFECT', particles: true };
  if (score >= 90)  return { color: '#10b981', bg: '#001a0d', label: 'EXCELLENT', particles: true };
  if (score >= 75)  return { color: '#3b82f6', bg: '#001226', label: 'SOLID', particles: false };
  if (score >= 60)  return { color: '#f59e0b', bg: '#1a1000', label: 'AVERAGE', particles: false };
  if (score >= 40)  return { color: '#f97316', bg: '#1a0a00', label: 'STRUGGLING', particles: false };
  return { color: '#ef4444', bg: '#1a0000', label: 'YIKES', particles: false };
}

// ── Sparkle particle ──────────────────────────────────────────────────────────
function Sparkle({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const frame = useCurrentFrame();
  const f = (frame - delay) % 40;
  const opacity = interpolate(f, [0, 5, 30, 40], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(f, [0, 10, 40], [0.2, 1.4, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      fontSize: 14, opacity, transform: `scale(${scale})`,
      color, filter: `drop-shadow(0 0 4px ${color})`,
    }}>✦</div>
  );
}

// ── Main composition ──────────────────────────────────────────────────────────
export function SkellyComposition({ score }: { score: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cfg = getTierConfig(score);
  const pose = useSkeletonPose(score, frame, fps);

  const entryProgress = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const entryScale = interpolate(entryProgress, [0, 1], [0.4, 1]);
  const entryOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: cfg.bg,
      fontFamily,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Glow ring */}
      <div style={{
        position: 'absolute',
        width: 160, height: 160,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${cfg.color}22, transparent 70%)`,
        filter: 'blur(20px)',
      }} />

      {/* Sparkles for top tiers */}
      {cfg.particles && [
        { x: 20, y: 30, delay: 0 }, { x: 140, y: 20, delay: 12 },
        { x: 160, y: 80, delay: 6 }, { x: 10, y: 90, delay: 18 },
        { x: 80, y: 10, delay: 9 }, { x: 110, y: 110, delay: 3 },
      ].map((p, i) => <Sparkle key={i} {...p} color={cfg.color} />)}

      {/* Skeleton SVG */}
      <div style={{
        opacity: entryOpacity,
        transform: `scale(${entryScale})`,
        filter: `drop-shadow(0 0 12px ${cfg.color}66)`,
      }}>
        <svg width={120} height={160} viewBox="0 0 120 160">
          <Skeleton
            bodyY={pose.bodyY}
            bodyRotate={pose.bodyRotate}
            headScale={pose.headScale}
            leftArmAngle={pose.leftArmAngle}
            rightArmAngle={pose.rightArmAngle}
            leftLegAngle={pose.leftLegAngle}
            rightLegAngle={pose.rightLegAngle}
            eyeScale={pose.eyeScale}
            color={cfg.color}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
}

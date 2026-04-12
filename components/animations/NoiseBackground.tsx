'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';

// Hero version — breathing blue/cyan gradient blobs
export function HeroNoiseBackground() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const GRID = 6; // resolution of noise grid
  const cellW = width / GRID;
  const cellH = height / GRID;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Base gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #f0fdf4 100%)',
      }} />

      {/* Noise blobs */}
      {Array.from({ length: GRID * GRID }).map((_, i) => {
        const col = i % GRID;
        const row = Math.floor(i / GRID);
        const nx = col / GRID;
        const ny = row / GRID;
        const t = frame / 180; // slow drift

        const n = noise2D('blob', nx + t * 0.3, ny + t * 0.2);
        const n2 = noise2D('blob2', nx + t * 0.15, ny + t * 0.25);

        const opacity = Math.max(0, (n + 1) / 2) * 0.09;
        const hue = 210 + n2 * 30; // blue range
        const size = cellW * 1.8;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: col * cellW - size / 4,
              top: row * cellH - size / 4,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `hsl(${hue}, 50%, 75%)`,
              opacity,
              filter: 'blur(40px)',
            }}
          />
        );
      })}

      {/* Floating orbs */}
      {[
        { seed: 'orb1', x: 0.15, y: 0.3, color: '#3b82f6', size: 180 },
        { seed: 'orb2', x: 0.75, y: 0.2, color: '#06b6d4', size: 220 },
        { seed: 'orb3', x: 0.5, y: 0.7, color: '#6366f1', size: 160 },
        { seed: 'orb4', x: 0.85, y: 0.65, color: '#10b981', size: 140 },
      ].map(({ seed, x, y, color, size }) => {
        const t = frame / 240;
        const dx = noise2D(seed + 'x', t, 0) * 60;
        const dy = noise2D(seed + 'y', 0, t) * 40;
        return (
          <div
            key={seed}
            style={{
              position: 'absolute',
              left: x * width + dx - size / 2,
              top: y * height + dy - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              opacity: 0.12,
              filter: 'blur(48px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// Dashboard version — dark floating particles
export function DashboardNoiseBackground() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const PARTICLES = 28;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const seed = `p${i}`;
        const t = frame / 300;
        const baseX = noise2D(seed + 'bx', i * 0.4, 0) * 0.5 + 0.5;
        const baseY = noise2D(seed + 'by', 0, i * 0.4) * 0.5 + 0.5;
        const dx = noise2D(seed + 'dx', t, i * 0.1) * 80;
        const dy = noise2D(seed + 'dy', i * 0.1, t) * 60;
        const scale = (noise2D(seed + 's', t * 0.5, 0) + 1) / 2;
        const opacity = ((noise2D(seed + 'o', 0, t * 0.7) + 1) / 2) * 0.35 + 0.05;
        const size = 4 + scale * 8;
        const hue = 200 + (i % 5) * 30;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: baseX * width + dx,
              top: baseY * height + dy,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `hsl(${hue}, 70%, 70%)`,
              opacity,
              boxShadow: `0 0 ${size * 2}px hsl(${hue}, 70%, 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

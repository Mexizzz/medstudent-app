'use client';

import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { DuckComposition, type DuckState } from './DuckComposition';

interface Props {
  state: DuckState;
  size?: number;
  streak?: number;
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '#6366f1';
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!val) return name === '--primary' ? '#6366f1' : '#0f172a';
  // hsl(...) → convert? Actually, just return it; Remotion can use hsl strings
  // But SVG fill might not understand CSS hsl(). Let's convert to hex fallback.
  return val || '#6366f1';
}

function hslToHex(hsl: string): string {
  // hsl(222.2 47.4% 11.2%) or hsl(222.2, 47.4%, 11.2%)
  const match = hsl.match(/[\d.]+/g);
  if (!match || match.length < 3) return hsl;
  const h = parseFloat(match[0]) / 360;
  const s = parseFloat(match[1]) / 100;
  const l = parseFloat(match[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function resolveColor(varName: string): string {
  const raw = getCSSVar(varName);
  if (raw.startsWith('hsl')) return hslToHex(raw);
  if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
  return '#6366f1';
}

export function DuckPlayer({ state, size = 160, streak = 0 }: Props) {
  const [colors, setColors] = useState({ primary: '#6366f1', bg: 'transparent' });

  useEffect(() => {
    function read() {
      setColors({
        primary: resolveColor('--primary'),
        bg: 'transparent',
      });
    }
    read();
    // Re-read when theme class changes
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Player
      component={DuckComposition}
      inputProps={{ state, primaryColor: colors.primary, bgColor: colors.bg, streak }}
      durationInFrames={300}
      fps={30}
      compositionWidth={160}
      compositionHeight={185}
      style={{ width: size, height: Math.round(size * 185 / 160) }}
      loop
      autoPlay
    />
  );
}

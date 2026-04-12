import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const TIER_STYLES: Record<string, { bg: string; accent: string; label: string }> = {
  PERFECT:   { bg: '#1a1200', accent: '#f59e0b', label: '⭐ PERFECT' },
  EXCELLENT: { bg: '#001a0d', accent: '#10b981', label: '🔥 EXCELLENT' },
  SOLID:     { bg: '#001226', accent: '#3b82f6', label: '💪 SOLID' },
  AVERAGE:   { bg: '#1a1000', accent: '#f59e0b', label: '📈 AVERAGE' },
  STRUGGLING:{ bg: '#1a0a00', accent: '#f97316', label: '😬 STRUGGLING' },
  YIKES:     { bg: '#1a0000', accent: '#ef4444', label: '💀 YIKES' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score   = parseInt(searchParams.get('score')   ?? '0');
  const tierKey = (searchParams.get('tier') ?? 'SOLID').toUpperCase();
  const correct = parseInt(searchParams.get('correct') ?? '0');
  const total   = parseInt(searchParams.get('total')   ?? '0');
  const date    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const style = TIER_STYLES[tierKey] ?? TIER_STYLES['SOLID'];
  const scoreColor = style.accent;

  // Fetch Inter Bold from Google Fonts
  const fontRes = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff'
  );
  const fontData = await fontRes.arrayBuffer();

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 315,
          display: 'flex',
          flexDirection: 'column',
          background: `radial-gradient(ellipse at 30% 50%, ${style.accent}22 0%, ${style.bg} 60%)`,
          border: `1.5px solid ${style.accent}44`,
          borderRadius: 20,
          padding: '28px 36px',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: `${style.accent}12`,
        }} />
        <div style={{
          position: 'absolute', right: 20, bottom: -40,
          width: 140, height: 140, borderRadius: '50%',
          background: `${style.accent}08`,
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 18,
            }}>M</div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>MedStudy</span>
            <div style={{
              background: `${style.accent}33`, borderRadius: 99,
              padding: '2px 8px', fontSize: 10, color: style.accent, fontWeight: 700,
            }}>AI</div>
          </div>
          {/* Date */}
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{date}</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 36, marginTop: 20 }}>
          {/* Score block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, letterSpacing: 2 }}>SCORE</span>
            <span style={{ color: scoreColor, fontSize: 88, fontWeight: 900, lineHeight: 1, textShadow: `0 0 48px ${scoreColor}60` }}>
              {score}%
            </span>
            <span style={{ color: style.accent, fontSize: 15, fontWeight: 800, letterSpacing: 3 }}>
              {style.label}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 110, background: `${style.accent}30` }} />

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: 1.5 }}>CORRECT</span>
              <span style={{ color: 'white', fontSize: 26, fontWeight: 800 }}>{correct} / {total}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: 1.5 }}>ACCURACY</span>
              <span style={{ color: scoreColor, fontSize: 26, fontWeight: 800 }}>{total > 0 ? Math.round((correct / total) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${score}%`,
              background: `linear-gradient(90deg, ${style.accent}aa, ${style.accent})`,
              borderRadius: 99,
            }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>medstudy.space — Study smarter with AI</span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 315,
      fonts: [{ name: 'Inter', data: fontData, weight: 900 }],
    }
  );
}

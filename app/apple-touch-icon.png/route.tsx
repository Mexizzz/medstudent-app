import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
          borderRadius: 36,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
          </svg>
          <div style={{ color: 'white', fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -1 }}>MS</div>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}

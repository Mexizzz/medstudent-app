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
        <span style={{ fontSize: 112, fontWeight: 900, color: 'white', fontFamily: 'Arial, sans-serif', lineHeight: 1 }}>M</span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}

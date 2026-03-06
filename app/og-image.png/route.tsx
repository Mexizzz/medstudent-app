import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #6366f1 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 10, display: 'flex' }}>&#x1FA7A;</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 16, display: 'flex' }}>MedStudy</div>
        <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 700, textAlign: 'center', lineHeight: 1.4, display: 'flex' }}>
          AI-Powered Medical Study App
        </div>
        <div style={{ fontSize: 20, opacity: 0.7, marginTop: 16, display: 'flex' }}>
          MCQs &bull; Flashcards &bull; AI Tutor &bull; Study Rooms
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

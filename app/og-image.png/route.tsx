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
        <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 16, display: 'flex', letterSpacing: '-2px' }}>MedStudy</div>
        <div style={{ fontSize: 28, opacity: 0.95, maxWidth: 700, textAlign: 'center', lineHeight: 1.4, display: 'flex', fontWeight: 600 }}>
          AI-Powered Medical Study Platform
        </div>
        <div style={{ fontSize: 20, opacity: 0.8, marginTop: 16, display: 'flex' }}>
          MCQs &bull; Flashcards &bull; Clinical Cases &bull; AI Tutor
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {['Free Plan', 'USMLE', 'PLAB', 'UKMLA'].map(tag => (
            <div key={tag} style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 16px', fontSize: 16 }}>{tag}</div>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 18, opacity: 0.6, display: 'flex' }}>medstudy.space</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

'use client';

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// A single MCQ card that flies in
function QuestionCard({
  delay,
  y,
  question,
  correct,
}: {
  delay: number;
  y: number;
  question: string;
  correct: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const translateX = interpolate(progress, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        top: y,
        width: 280,
        opacity,
        transform: `translateX(${translateX}px)`,
        background: 'white',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Generated MCQ</div>
      <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>{question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {['A', 'B', 'C', 'D'].map((opt, i) => (
          <div
            key={opt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 6,
              background: i === 0 ? '#dcfce7' : '#f8fafc',
              border: `1px solid ${i === 0 ? '#86efac' : '#e2e8f0'}`,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: i === 0 ? '#16a34a' : '#94a3b8' }}>{opt}</span>
            <span style={{ fontSize: 10, color: i === 0 ? '#15803d' : '#64748b' }}>
              {i === 0 ? correct : ['Incorrect option', 'Wrong answer', 'Distractor'][i - 1]}
            </span>
            {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#16a34a', fontWeight: 700 }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Typing text animation
function TypingText({ text, startFrame, color = '#1e293b', fontSize = 13 }: { text: string; startFrame: number; color?: string; fontSize?: number }) {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor(interpolate(frame - startFrame, [0, text.length * 1.5], [0, text.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  return (
    <span style={{ color, fontSize, fontFamily: 'monospace', fontWeight: 500 }}>
      {text.slice(0, charsToShow)}
      {charsToShow < text.length && frame > startFrame && (
        <span style={{ opacity: Math.floor((frame - startFrame) / 6) % 2 === 0 ? 1 : 0, color: '#3b82f6' }}>|</span>
      )}
    </span>
  );
}

// Floating note card on the left
function NoteCard({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 100 } });
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 20,
        top: 40,
        width: 200,
        opacity,
        transform: `translateY(${translateY}px)`,
        background: '#fffbeb',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid #fde68a',
      }}
    >
      <div style={{ fontSize: 10, color: '#92400e', marginBottom: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>📄</span> Lecture Notes
      </div>
      <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.6 }}>
        <TypingText text="The cardiac cycle consists of systole and diastole. During systole, the ventricles contract..." startFrame={delay + 5} color="#78350f" fontSize={10} />
      </div>
    </div>
  );
}

// AI processing indicator
function AIProcessor({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);

  const dotOpacity = (i: number) => {
    const cycle = (frame - delay - 20) % 30;
    return interpolate(cycle - i * 8, [0, 8, 16], [0.3, 1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
        width: 120,
      }}
    >
      <div style={{ fontSize: 22 }}>🧠</div>
      <div style={{ fontSize: 10, color: 'white', fontWeight: 700, letterSpacing: '0.05em' }}>AI Processing</div>
      {frame > delay + 20 && (
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: dotOpacity(i) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        opacity: bgOpacity,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Note card */}
      <NoteCard delay={10} />

      {/* Arrow from note to AI */}
      {frame > 30 && (
        <div style={{
          position: 'absolute',
          left: 228,
          top: '50%',
          fontSize: 18,
          opacity: interpolate(frame, [30, 40], [0, 1], { extrapolateRight: 'clamp' }),
          transform: 'translateY(-50%)',
        }}>→</div>
      )}

      {/* AI processor */}
      <AIProcessor delay={35} />

      {/* Arrow from AI to cards */}
      {frame > 60 && (
        <div style={{
          position: 'absolute',
          right: 308,
          top: '50%',
          fontSize: 18,
          opacity: interpolate(frame, [60, 70], [0, 1], { extrapolateRight: 'clamp' }),
          transform: 'translateY(-50%)',
        }}>→</div>
      )}

      {/* MCQ cards */}
      <QuestionCard
        delay={70}
        y={20}
        question="Which phase of the cardiac cycle involves ventricular contraction?"
        correct="Systole"
      />
      <QuestionCard
        delay={90}
        y={175}
        question="What fills the ventricles during diastole?"
        correct="Oxygenated blood from atria"
      />

      {/* Bottom label */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 11,
        color: '#64748b',
        opacity: interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}>
        Upload notes → Instant AI-generated questions
      </div>
    </AbsoluteFill>
  );
}

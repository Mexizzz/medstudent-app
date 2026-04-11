'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

export type SkellyMood = 'happy' | 'encouraging' | 'disappointed' | 'idle' | 'celebrating';

type Props = {
  mood: SkellyMood;
  streak: number;
  todayComplete: boolean;
  userName?: string;
};

const MESSAGES: Record<SkellyMood, string[]> = {
  happy: [
    "Outstanding! Even my bones are impressed.",
    "That's what I'm talking about! 🔥",
    "You're on fire today.",
    "Look at you actually studying!",
    "Keep this up and you'll be a legend.",
    "Proper effort. Respect.",
  ],
  celebrating: [
    "THAT SCORE?! Let's gooo!! 🎉",
    "I'm literally rattling with excitement.",
    "Certified genius. I called it.",
    "Doctor mode: ACTIVATED. 🩺",
    "Clean. Absolutely clean. I'm so proud.",
  ],
  encouraging: [
    "Open those books. I'll wait.",
    "You've got this. I believe in your skeleton.",
    "One session. That's all. Let's go.",
    "Your future patients need you to study.",
    "The library is calling. Pick up.",
  ],
  disappointed: [
    "...you didn't study yesterday, did you.",
    "I waited all day. ALL day.",
    "You know what has no bones? Your excuses.",
    "Even I study harder — and I'm dead.",
    "Your anatomy prof is shaking their head rn.",
    "Zero sessions. Do better. I believe in you... barely.",
    "The books cried last night. Just so you know.",
  ],
  idle: [
    "Ready when you are.",
    "Let's crack some anatomy. 💀",
    "Your brain won't fill itself.",
    "Skelly is standing by.",
    "What are we studying today?",
  ],
};

function getRandomMessage(mood: SkellyMood, streak: number, userName?: string) {
  const pool = [...MESSAGES[mood]];
  if (mood === 'encouraging' && streak > 1) pool.push(`Day ${streak} streak alive — don't blow it now.`);
  let msg = pool[Math.floor(Math.random() * pool.length)];
  if (userName && mood === 'disappointed' && Math.random() < 0.45) {
    const p = [`${userName}… we need to talk.`, `${userName}! The books missed you. So did I. 😤`, `Where were you yesterday, ${userName}?`];
    msg = p[Math.floor(Math.random() * p.length)];
  }
  return msg;
}

// ── Lottie wrapper (dynamic import — avoids SSR issues) ─────────────────────
function LottiePlayer({ src, loop, speed }: { src: string; loop: boolean; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [Player, setPlayer] = useState<any>(null);

  useEffect(() => {
    import('@lottiefiles/react-lottie-player').then(m => setPlayer(() => m.Player));
  }, []);

  if (!Player) return null;

  return (
    <Player
      src={src}
      autoplay
      loop={loop}
      speed={speed ?? 1}
      style={{ width: 160, height: 160 }}
    />
  );
}

// ── Fallback: simple stylised skull emoji mascot ────────────────────────────
function FallbackSkelly({ mood }: { mood: SkellyMood }) {
  const happy = mood === 'happy' || mood === 'celebrating';
  const sad = mood === 'disappointed';
  const animClass = {
    happy: 'sk-bounce',
    celebrating: 'sk-pop',
    encouraging: 'sk-nod',
    disappointed: 'sk-shake',
    idle: 'sk-bob',
  }[mood];

  return (
    <div className={cn('flex flex-col items-center', animClass)} style={{ fontSize: 72, lineHeight: 1, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.25))' }}>
      {happy ? '💀✨' : sad ? '😰' : '💀'}
      <style>{`
        @keyframes sk-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes sk-bounce { 0%,100%{transform:translateY(0) rotate(0deg)} 30%{transform:translateY(-16px) rotate(-5deg)} 70%{transform:translateY(-8px) rotate(5deg)} }
        @keyframes sk-pop { 0%,100%{transform:scale(1) rotate(0deg)} 25%{transform:scale(1.18) rotate(-6deg)} 75%{transform:scale(1.12) rotate(6deg)} }
        @keyframes sk-nod { 0%,100%{transform:translateY(0) rotate(0deg)} 40%{transform:translateY(-5px) rotate(-3deg)} 70%{transform:translateY(-3px) rotate(3deg)} }
        @keyframes sk-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px) rotate(-4deg)} 40%{transform:translateX(8px) rotate(4deg)} 60%{transform:translateX(-5px) rotate(-2deg)} 80%{transform:translateX(5px) rotate(2deg)} }
        .sk-bob { animation: sk-bob 3s ease-in-out infinite; }
        .sk-bounce { animation: sk-bounce 0.85s ease-in-out infinite; }
        .sk-pop { animation: sk-pop 0.6s ease-in-out infinite; }
        .sk-nod { animation: sk-nod 2.2s ease-in-out infinite; }
        .sk-shake { animation: sk-shake 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function SkellyMascot({ mood, streak, todayComplete, userName }: Props) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(true);
  const [key, setKey] = useState(0);
  const [hasLottie, setHasLottie] = useState(false);

  // Check if lottie file exists
  useEffect(() => {
    fetch('/lottie/skelly.json', { method: 'HEAD' })
      .then(r => setHasLottie(r.ok))
      .catch(() => setHasLottie(false));
  }, []);

  useEffect(() => {
    setMessage(getRandomMessage(mood, streak, userName));
  }, [mood, streak, userName]);

  function handleClick() {
    setVisible(false);
    setTimeout(() => {
      setMessage(getRandomMessage(mood, streak, userName));
      setKey(k => k + 1);
      setVisible(true);
    }, 120);
  }

  const bubbleColors: Record<SkellyMood, string> = {
    happy: 'bg-emerald-500 text-white',
    celebrating: 'bg-yellow-400 text-yellow-900',
    encouraging: 'bg-blue-500 text-white',
    disappointed: 'bg-red-500 text-white',
    idle: 'bg-white/90 text-slate-800',
  };
  const tailColors: Record<SkellyMood, string> = {
    happy: 'border-t-emerald-500',
    celebrating: 'border-t-yellow-400',
    encouraging: 'border-t-blue-500',
    disappointed: 'border-t-red-500',
    idle: 'border-t-white/90',
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ minWidth: 140 }}>
      {/* Speech bubble */}
      <div
        key={key}
        className={cn(
          'relative px-3 py-2 rounded-xl text-xs font-semibold text-center shadow-lg max-w-[170px] leading-snug transition-all duration-200',
          bubbleColors[mood],
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {message}
        <div className={cn('absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[9px] border-transparent', tailColors[mood])} />
      </div>

      {/* Character */}
      <div className="cursor-pointer mt-1" onClick={handleClick} title="Tap Skelly">
        {hasLottie ? (
          <LottiePlayer
            src="/lottie/skelly.json"
            loop={true}
            speed={mood === 'celebrating' ? 1.5 : mood === 'disappointed' ? 0.7 : 1}
          />
        ) : (
          <FallbackSkelly mood={mood} />
        )}
      </div>

      <p className="text-[9px] opacity-30 tracking-widest uppercase font-semibold mt-1">tap skelly</p>
    </div>
  );
}

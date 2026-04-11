'use client';

import { useEffect, useState } from 'react';
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
    "Yoooo let's GO! 🔥",
    "That's what I'm talking about!",
    "You're on fire today! 🎉",
    "Look at you actually studying!",
    "Outstanding! Even my bones are impressed.",
    "Keep it up and I'll do a little dance! 💃",
  ],
  celebrating: [
    "YESSS!! 🎉🎉🎉",
    "I'm literally rattling with excitement!",
    "Bones are JUMPING! You crushed it!",
    "That score? CLEAN. I'm so proud of you.",
    "Doctor mode: ACTIVATED. Let's go!!! 🩺",
  ],
  encouraging: [
    "Come on, open those books! 📚",
    "You've got this. I believe in your skeleton.",
    "One session. That's all. Let's go.",
    "Your future patients need you to study. No pressure 😅",
    "The library is waiting... and so am I.",
    "Day " + "streak" + "! Don't break it now!",
  ],
  disappointed: [
    "...you didn't study yesterday, did you.",
    "I waited ALL day. ALL day.",
    "The books are crying. I'm crying. Well, I would if I had eyes.",
    "You know what has no bones? Your excuses.",
    "Even I study harder than this — and I'm dead.",
    "Your anatomy professor is shaking their head right now.",
    "Zero sessions yesterday. Do better. I believe in you... barely.",
  ],
  idle: [
    "Boo! 👻 Ready to study?",
    "I'm just hanging here... waiting...",
    "Let's crack open some anatomy! 💀",
    "Your brain won't fill itself. Let's go!",
    "Skelly is ready when you are!",
  ],
};

function getRandomMessage(mood: SkellyMood, streak: number, userName?: string) {
  const pool = MESSAGES[mood];
  let msg = pool[Math.floor(Math.random() * pool.length)];
  if (mood === 'encouraging' && streak > 1) {
    msg = `Day ${streak} streak! Don't break it now! 💪`;
  }
  if (userName && mood === 'disappointed') {
    const personalised = [
      `${userName}... we need to talk.`,
      `${userName}! The books missed you yesterday. So did I. 😤`,
      `Where were you yesterday, ${userName}? The skeleton wants answers.`,
    ];
    if (Math.random() < 0.4) msg = personalised[Math.floor(Math.random() * personalised.length)];
  }
  return msg;
}

// ─── SVG Parts ────────────────────────────────────────────────────────────────

function Skull({ mood }: { mood: SkellyMood }) {
  const isHappy = mood === 'happy' || mood === 'celebrating';
  const isSad = mood === 'disappointed';
  return (
    <g>
      {/* Head */}
      <ellipse cx="50" cy="28" rx="22" ry="24" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      {/* Cheekbones */}
      <ellipse cx="34" cy="36" rx="6" ry="4" fill="#e8e0d0" opacity="0.6" />
      <ellipse cx="66" cy="36" rx="6" ry="4" fill="#e8e0d0" opacity="0.6" />
      {/* Eye sockets */}
      <ellipse cx="41" cy="26" rx="8" ry="8" fill="#1a1a2e" />
      <ellipse cx="59" cy="26" rx="8" ry="8" fill="#1a1a2e" />
      {/* Eye shine */}
      <circle cx="44" cy="23" r="2.5" fill="white" opacity="0.8" />
      <circle cx="62" cy="23" r="2.5" fill="white" opacity="0.8" />
      {/* Pupils / mood eyes */}
      {isHappy ? (
        <>
          {/* Happy curved eyes */}
          <path d="M37 27 Q41 22 45 27" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M55 27 Q59 22 63 27" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : isSad ? (
        <>
          {/* Sad eyes — pupils low */}
          <circle cx="41" cy="28" r="3" fill="white" opacity="0.9" />
          <circle cx="59" cy="28" r="3" fill="white" opacity="0.9" />
          {/* Sad brow */}
          <path d="M35 19 Q41 23 47 20" stroke="#c8c0b0" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M53 20 Q59 23 65 19" stroke="#c8c0b0" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="41" cy="26" r="3" fill="white" opacity="0.9" />
          <circle cx="59" cy="26" r="3" fill="white" opacity="0.9" />
        </>
      )}
      {/* Nasal cavity */}
      <path d="M47 35 L50 40 L53 35" fill="#c8c0b0" opacity="0.7" />
      {/* Teeth */}
      <rect x="38" y="44" width="5" height="6" rx="1" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
      <rect x="44" y="44" width="5" height="7" rx="1" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
      <rect x="50" y="44" width="5" height="7" rx="1" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
      <rect x="56" y="44" width="5" height="6" rx="1" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
      {/* Jaw */}
      <path d="M30 42 Q50 56 70 42" fill="none" stroke="#c8c0b0" strokeWidth="1.5" />
      {/* Happy blush */}
      {isHappy && (
        <>
          <ellipse cx="34" cy="34" rx="5" ry="3" fill="#ffb3b3" opacity="0.4" />
          <ellipse cx="66" cy="34" rx="5" ry="3" fill="#ffb3b3" opacity="0.4" />
        </>
      )}
    </g>
  );
}

function Body({ mood }: { mood: SkellyMood }) {
  const isHappy = mood === 'happy' || mood === 'celebrating';
  return (
    <g>
      {/* Neck */}
      <rect x="46" y="50" width="8" height="10" rx="3" fill="#e8e0d0" stroke="#c8c0b0" strokeWidth="1" />
      {/* Clavicles */}
      <path d="M25 62 Q50 58 75 62" fill="none" stroke="#c8c0b0" strokeWidth="2" strokeLinecap="round" />
      {/* Ribcage */}
      <ellipse cx="50" cy="82" rx="20" ry="24" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      {/* Sternum */}
      <line x1="50" y1="60" x2="50" y2="106" stroke="#c8c0b0" strokeWidth="1.5" />
      {/* Ribs left */}
      <path d="M50 66 Q36 68 32 74" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 73 Q34 75 30 82" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 80 Q34 82 32 90" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 87 Q36 90 34 97" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      {/* Ribs right */}
      <path d="M50 66 Q64 68 68 74" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 73 Q66 75 70 82" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 80 Q66 82 68 90" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 87 Q64 90 66 97" fill="none" stroke="#c8c0b0" strokeWidth="1.5" strokeLinecap="round" />
      {/* Pelvis */}
      <ellipse cx="50" cy="112" rx="18" ry="10" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      <ellipse cx="50" cy="112" rx="10" ry="5" fill="#e0d8c8" stroke="#c8c0b0" strokeWidth="1" />
    </g>
  );
}

function Arms({ mood }: { mood: SkellyMood }) {
  const isHappy = mood === 'happy' || mood === 'celebrating';
  const isSad = mood === 'disappointed';
  const isEncouraging = mood === 'encouraging';

  if (isHappy) {
    // Arms up celebrating
    return (
      <g className="skelly-arms-happy">
        {/* Left arm up */}
        <line x1="30" y1="62" x2="12" y2="42" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="12" y1="42" x2="6" y2="24" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        {/* Left hand */}
        <circle cx="6" cy="22" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
        {/* Right arm up */}
        <line x1="70" y1="62" x2="88" y2="42" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="88" y1="42" x2="94" y2="24" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        {/* Right hand */}
        <circle cx="94" cy="22" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      </g>
    );
  }

  if (isSad) {
    // Arms drooped down sadly
    return (
      <g>
        <line x1="30" y1="65" x2="18" y2="88" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="18" y1="88" x2="14" y2="108" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="14" cy="111" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
        <line x1="70" y1="65" x2="82" y2="88" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="82" y1="88" x2="86" y2="108" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="86" cy="111" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      </g>
    );
  }

  if (isEncouraging) {
    // Right arm thumbs up
    return (
      <g>
        <line x1="30" y1="65" x2="16" y2="82" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="16" y1="82" x2="12" y2="100" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="103" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
        {/* Right arm up (thumbs up) */}
        <line x1="70" y1="65" x2="84" y2="50" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="84" y1="50" x2="90" y2="35" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        {/* Thumb up fist */}
        <ellipse cx="92" cy="31" rx="5" ry="6" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
        <line x1="92" y1="25" x2="92" y2="18" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  // Default / idle arms
  return (
    <g>
      <line x1="30" y1="65" x2="16" y2="85" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="16" y1="85" x2="12" y2="104" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="107" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      <line x1="70" y1="65" x2="84" y2="85" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="84" y1="85" x2="88" y2="104" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="88" cy="107" r="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
    </g>
  );
}

function Legs({ mood }: { mood: SkellyMood }) {
  const isHappy = mood === 'happy' || mood === 'celebrating';
  if (isHappy) {
    return (
      <g>
        {/* Legs kicking */}
        <line x1="42" y1="120" x2="30" y2="142" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="30" y1="142" x2="18" y2="155" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="14" cy="157" rx="6" ry="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
        <line x1="58" y1="120" x2="72" y2="138" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="72" y1="138" x2="84" y2="148" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="88" cy="150" rx="6" ry="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      </g>
    );
  }
  return (
    <g>
      <line x1="42" y1="120" x2="36" y2="144" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="36" y1="144" x2="34" y2="162" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="34" cy="165" rx="8" ry="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
      <line x1="58" y1="120" x2="64" y2="144" stroke="#c8c0b0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="64" y1="144" x2="66" y2="162" stroke="#c8c0b0" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="66" cy="165" rx="8" ry="4" fill="#f0ede8" stroke="#c8c0b0" strokeWidth="1.5" />
    </g>
  );
}

function Stethoscope() {
  return (
    <g opacity="0.9">
      <path d="M58 62 Q72 65 74 76 Q76 88 68 92" fill="none" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="66" cy="94" r="5" fill="none" stroke="#4a9eff" strokeWidth="2" />
      <circle cx="66" cy="94" r="2.5" fill="#4a9eff" />
      <line x1="58" y1="62" x2="54" y2="58" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="58" x2="52" y2="54" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SkellyMascot({ mood, streak, todayComplete, userName }: Props) {
  const [message, setMessage] = useState('');
  const [showBubble, setShowBubble] = useState(true);
  const [bubbleKey, setBubbleKey] = useState(0);

  useEffect(() => {
    setMessage(getRandomMessage(mood, streak, userName));
  }, [mood, streak, userName]);

  function handleClick() {
    setShowBubble(false);
    setTimeout(() => {
      setMessage(getRandomMessage(mood, streak, userName));
      setBubbleKey(k => k + 1);
      setShowBubble(true);
    }, 150);
  }

  const animClass = {
    happy: 'skelly-happy',
    celebrating: 'skelly-celebrating',
    encouraging: 'skelly-encouraging',
    disappointed: 'skelly-disappointed',
    idle: 'skelly-idle',
  }[mood];

  return (
    <div className="flex flex-col items-center select-none">
      {/* Speech bubble */}
      <div
        key={bubbleKey}
        className={cn(
          'relative max-w-[220px] px-4 py-2.5 rounded-2xl text-sm font-medium text-center mb-2 shadow-md transition-all duration-300',
          showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
          mood === 'happy' || mood === 'celebrating'
            ? 'bg-emerald-500 text-white'
            : mood === 'disappointed'
            ? 'bg-red-500 text-white'
            : mood === 'encouraging'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-slate-700 border border-slate-200'
        )}
        style={{ animationDelay: '0.2s' }}
      >
        {message}
        {/* Bubble tail */}
        <div
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0',
            'border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent',
            mood === 'happy' || mood === 'celebrating'
              ? 'border-t-emerald-500'
              : mood === 'disappointed'
              ? 'border-t-red-500'
              : mood === 'encouraging'
              ? 'border-t-blue-500'
              : 'border-t-white'
          )}
        />
      </div>

      {/* Skeleton SVG */}
      <div
        className={cn('cursor-pointer', animClass)}
        onClick={handleClick}
        title="Click Skelly for a new message!"
      >
        <svg
          viewBox="0 0 100 175"
          width="110"
          height="175"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}
        >
          <Legs mood={mood} />
          <Body mood={mood} />
          <Arms mood={mood} />
          <Stethoscope />
          <Skull mood={mood} />
        </svg>
      </div>

      <p className="text-[10px] mt-1 opacity-40 font-medium" style={{ color: 'inherit' }}>
        tap Skelly
      </p>

      <style>{`
        /* Idle bob */
        @keyframes skelly-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .skelly-idle {
          animation: skelly-bob 3s ease-in-out infinite;
        }

        /* Happy bounce */
        @keyframes skelly-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-12px) rotate(-4deg) scale(1.05); }
          75% { transform: translateY(-6px) rotate(4deg) scale(1.03); }
        }
        .skelly-happy {
          animation: skelly-bounce 0.8s ease-in-out infinite;
        }

        /* Celebrating — fast jump */
        @keyframes skelly-celebrate {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          20% { transform: translateY(-18px) scale(1.08) rotate(-5deg); }
          40% { transform: translateY(-10px) scale(1.04) rotate(5deg); }
          60% { transform: translateY(-16px) scale(1.07) rotate(-3deg); }
          80% { transform: translateY(-8px) scale(1.03) rotate(3deg); }
        }
        .skelly-celebrating {
          animation: skelly-celebrate 0.6s ease-in-out infinite;
        }

        /* Encouraging — gentle nod */
        @keyframes skelly-nod {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-4px) rotate(-2deg); }
          70% { transform: translateY(-2px) rotate(2deg); }
        }
        .skelly-encouraging {
          animation: skelly-nod 2s ease-in-out infinite;
        }

        /* Disappointed — shake head (wiggle) */
        @keyframes skelly-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-5px) rotate(-3deg); }
          30% { transform: translateX(5px) rotate(3deg); }
          45% { transform: translateX(-4px) rotate(-2deg); }
          60% { transform: translateX(4px) rotate(2deg); }
          75% { transform: translateX(-2px) rotate(-1deg); }
          90% { transform: translateX(2px) rotate(1deg); }
        }
        .skelly-disappointed {
          animation: skelly-shake 2.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
}

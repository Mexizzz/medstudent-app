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
    "Clean. Absolutely clean. I'm proud.",
  ],
  encouraging: [
    "Open those books. I'll wait.",
    "You've got this. I believe in your skeleton.",
    "One session. That's all. Let's go.",
    "Your future patients need you to study.",
    "The library is calling. Pick up.",
    `Day ${0} streak alive — don't blow it now.`,
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
  if (mood === 'encouraging' && streak > 1) {
    pool.push(`Day ${streak} streak alive — don't blow it now.`);
  }
  let msg = pool[Math.floor(Math.random() * pool.length)];
  if (userName && mood === 'disappointed' && Math.random() < 0.45) {
    const p = [
      `${userName}… we need to talk.`,
      `${userName}! The books missed you. So did I. 😤`,
      `Where were you yesterday, ${userName}?`,
    ];
    msg = p[Math.floor(Math.random() * p.length)];
  }
  return msg;
}

// ─── SVG Skeleton ─────────────────────────────────────────────────────────────

function SkellyBody({ mood }: { mood: SkellyMood }) {
  const happy = mood === 'happy' || mood === 'celebrating';
  const sad = mood === 'disappointed';
  const encourage = mood === 'encouraging';

  return (
    <svg viewBox="0 0 120 220" width="120" height="220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="skullGrad" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d4cfc8" />
        </radialGradient>
        <radialGradient id="boneGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f5f2ed" />
          <stop offset="100%" stopColor="#c8c2b8" />
        </radialGradient>
        <filter id="boneShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000030" />
        </filter>
        <filter id="glowHappy">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── LEGS ── */}
      {happy ? (
        <g filter="url(#boneShadow)">
          {/* Left leg kicking out */}
          <line x1="50" y1="158" x2="28" y2="178" stroke="url(#boneGrad)" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="24" cy="180" rx="8" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="28" y1="178" x2="14" y2="196" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="10" cy="198" rx="9" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          {/* Right leg kicking out */}
          <line x1="70" y1="158" x2="92" y2="175" stroke="url(#boneGrad)" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="96" cy="177" rx="8" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="92" y1="175" x2="106" y2="192" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="110" cy="194" rx="9" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      ) : (
        <g filter="url(#boneShadow)">
          {/* Left leg */}
          <line x1="50" y1="158" x2="44" y2="185" stroke="url(#boneGrad)" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="43" cy="187" rx="7" ry="4.5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="44" y1="185" x2="38" y2="208" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="36" cy="211" rx="10" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          {/* Right leg */}
          <line x1="70" y1="158" x2="76" y2="185" stroke="url(#boneGrad)" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="77" cy="187" rx="7" ry="4.5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="76" y1="185" x2="82" y2="208" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="84" cy="211" rx="10" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      )}

      {/* ── PELVIS ── */}
      <g filter="url(#boneShadow)">
        <ellipse cx="60" cy="155" rx="22" ry="11" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1.2" />
        <ellipse cx="60" cy="155" rx="13" ry="6" fill="#ddd8d0" stroke="#b8b0a0" strokeWidth="0.8" />
        <ellipse cx="46" cy="155" rx="5" ry="7" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        <ellipse cx="74" cy="155" rx="5" ry="7" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
      </g>

      {/* ── SPINE ── */}
      {[100, 108, 116, 124, 132, 140, 148].map((y, i) => (
        <ellipse key={i} cx="60" cy={y} rx="4.5" ry="3.5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="0.8" />
      ))}

      {/* ── RIBCAGE ── */}
      <g filter="url(#boneShadow)">
        <ellipse cx="60" cy="118" rx="24" ry="28" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1.2" />
        {/* Sternum */}
        <rect x="57" y="92" width="6" height="50" rx="3" fill="#ddd8d0" stroke="#b8b0a0" strokeWidth="0.8" />
        {/* Left ribs */}
        <path d="M57 99 Q42 101 37 109" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 107 Q40 109 34 118" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 115 Q40 117 35 126" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 123 Q41 126 37 134" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 131 Q42 134 39 142" fill="none" stroke="#b8b0a0" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right ribs */}
        <path d="M63 99 Q78 101 83 109" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M63 107 Q80 109 86 118" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M63 115 Q80 117 85 126" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M63 123 Q79 126 83 134" fill="none" stroke="#b8b0a0" strokeWidth="2" strokeLinecap="round" />
        <path d="M63 131 Q78 134 81 142" fill="none" stroke="#b8b0a0" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* ── ARMS ── */}
      {happy ? (
        <g filter="url(#boneShadow)">
          {/* Left arm raised */}
          <line x1="36" y1="98" x2="16" y2="74" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="14" cy="72" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="14" y1="69" x2="6" y2="52" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="5" cy="49" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          {/* Right arm raised */}
          <line x1="84" y1="98" x2="104" y2="74" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="106" cy="72" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="106" y1="69" x2="114" y2="52" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="115" cy="49" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      ) : sad ? (
        <g filter="url(#boneShadow)">
          {/* Both arms drooped */}
          <line x1="36" y1="98" x2="20" y2="122" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="18" cy="124" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="18" y1="124" x2="14" y2="148" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="13" cy="151" rx="7" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="84" y1="98" x2="100" y2="122" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="102" cy="124" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="102" y1="124" x2="106" y2="148" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="107" cy="151" rx="7" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      ) : encourage ? (
        <g filter="url(#boneShadow)">
          {/* Left arm relaxed */}
          <line x1="36" y1="98" x2="20" y2="118" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="18" cy="120" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="18" y1="120" x2="14" y2="140" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="13" cy="143" rx="7" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          {/* Right arm — thumbs up */}
          <line x1="84" y1="98" x2="102" y2="78" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="104" cy="76" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="104" y1="73" x2="108" y2="58" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          {/* Fist */}
          <rect x="104" y="50" width="10" height="12" rx="4" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1.2" />
          {/* Thumb up */}
          <rect x="113" y="46" width="5" height="10" rx="2.5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      ) : (
        <g filter="url(#boneShadow)">
          {/* Default relaxed */}
          <line x1="36" y1="98" x2="18" y2="120" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="16" cy="122" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="16" y1="122" x2="12" y2="144" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="11" cy="147" rx="7" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="84" y1="98" x2="102" y2="120" stroke="url(#boneGrad)" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="104" cy="122" rx="6" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
          <line x1="104" y1="122" x2="108" y2="144" stroke="url(#boneGrad)" strokeWidth="5.5" strokeLinecap="round" />
          <ellipse cx="109" cy="147" rx="7" ry="5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="1" />
        </g>
      )}

      {/* ── CLAVICLES ── */}
      <g filter="url(#boneShadow)">
        <path d="M36 92 Q60 86 84 92" fill="none" stroke="url(#boneGrad)" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* ── NECK ── */}
      <g filter="url(#boneShadow)">
        {[68, 74, 80].map((y, i) => (
          <ellipse key={i} cx="60" cy={y} rx="5" ry="3.5" fill="url(#boneGrad)" stroke="#b8b0a0" strokeWidth="0.9" />
        ))}
      </g>

      {/* ── SKULL ── */}
      <g filter="url(#boneShadow)">
        {/* Cranium */}
        <ellipse cx="60" cy="40" rx="28" ry="30" fill="url(#skullGrad)" stroke="#b8b0a0" strokeWidth="1.5" />
        {/* Temporal bones */}
        <ellipse cx="34" cy="46" rx="7" ry="10" fill="url(#skullGrad)" stroke="#b8b0a0" strokeWidth="1" />
        <ellipse cx="86" cy="46" rx="7" ry="10" fill="url(#skullGrad)" stroke="#b8b0a0" strokeWidth="1" />
        {/* Zygomatic arch */}
        <path d="M36 54 Q45 58 54 56" fill="none" stroke="#b8b0a0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M66 56 Q75 58 84 54" fill="none" stroke="#b8b0a0" strokeWidth="1.5" strokeLinecap="round" />

        {/* ── EYE SOCKETS ── */}
        <ellipse cx="46" cy="38" rx="11" ry="11" fill="#18182a" stroke="#b8b0a0" strokeWidth="1" />
        <ellipse cx="74" cy="38" rx="11" ry="11" fill="#18182a" stroke="#b8b0a0" strokeWidth="1" />

        {/* Eyes by mood */}
        {happy ? (
          <>
            {/* Upward curved happy eyes */}
            <path d="M38 40 Q46 32 54 40" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M66 40 Q74 32 82 40" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Blush */}
            <ellipse cx="36" cy="50" rx="7" ry="4" fill="#ff9999" opacity="0.35" />
            <ellipse cx="84" cy="50" rx="7" ry="4" fill="#ff9999" opacity="0.35" />
          </>
        ) : sad ? (
          <>
            {/* Sad downturned pupils */}
            <ellipse cx="46" cy="41" rx="4" ry="5" fill="white" opacity="0.85" />
            <ellipse cx="74" cy="41" rx="4" ry="5" fill="white" opacity="0.85" />
            {/* Sad brows */}
            <path d="M38 28 Q46 33 54 29" stroke="#b8b0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M66 29 Q74 33 82 28" stroke="#b8b0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Tear */}
            <ellipse cx="50" cy="48" rx="2" ry="3" fill="#88ccff" opacity="0.7" />
          </>
        ) : (
          <>
            {/* Normal sharp pupils */}
            <ellipse cx="46" cy="38" rx="4.5" ry="5" fill="white" opacity="0.9" />
            <ellipse cx="74" cy="38" rx="4.5" ry="5" fill="white" opacity="0.9" />
            <circle cx="47" cy="37" r="1.5" fill="#18182a" />
            <circle cx="75" cy="37" r="1.5" fill="#18182a" />
            {/* Eye shine */}
            <circle cx="49" cy="35" r="1.2" fill="white" opacity="0.6" />
            <circle cx="77" cy="35" r="1.2" fill="white" opacity="0.6" />
          </>
        )}

        {/* ── NASAL CAVITY ── */}
        <path d="M56 52 L60 58 L64 52" fill="#b8b0a0" opacity="0.7" />

        {/* ── JAW / TEETH ── */}
        <path d="M36 60 Q60 70 84 60" fill="url(#skullGrad)" stroke="#b8b0a0" strokeWidth="1.2" />
        {/* Upper teeth */}
        {[41, 47, 53, 59, 65, 71].map((x, i) => (
          <rect key={i} x={x} y="60" width="5" height={i === 0 || i === 5 ? 6 : 8} rx="1.5" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
        ))}
        {/* Jaw line */}
        <path d="M36 60 Q38 72 44 76 Q60 80 76 76 Q82 72 84 60" fill="url(#skullGrad)" stroke="#b8b0a0" strokeWidth="1.2" />
        {/* Lower teeth */}
        {[42, 48, 54, 60, 66, 72].map((x, i) => (
          <rect key={i} x={x} y="70" width="5" height={i === 0 || i === 5 ? 5 : 7} rx="1.5" fill="white" stroke="#c8c0b0" strokeWidth="0.8" />
        ))}

        {/* ── STETHOSCOPE ── */}
        <path d="M68 78 Q82 80 84 92 Q86 106 76 112" fill="none" stroke="#4a90e2" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="74" cy="114" r="6" fill="none" stroke="#4a90e2" strokeWidth="2.5" />
        <circle cx="74" cy="114" r="3" fill="#4a90e2" />
        <path d="M68 78 L66 74 L62 70" fill="none" stroke="#4a90e2" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SkellyMascot({ mood, streak, todayComplete, userName }: Props) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(true);
  const [key, setKey] = useState(0);

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

  const bubbleColor = {
    happy: 'bg-emerald-500 text-white',
    celebrating: 'bg-yellow-400 text-yellow-900',
    encouraging: 'bg-blue-500 text-white',
    disappointed: 'bg-red-500 text-white',
    idle: 'bg-white/90 text-slate-800',
  }[mood];

  const bubbleTail = {
    happy: 'border-t-emerald-500',
    celebrating: 'border-t-yellow-400',
    encouraging: 'border-t-blue-500',
    disappointed: 'border-t-red-500',
    idle: 'border-t-white/90',
  }[mood];

  const animClass = {
    happy: 'skelly-happy',
    celebrating: 'skelly-celebrating',
    encouraging: 'skelly-encourage',
    disappointed: 'skelly-sad',
    idle: 'skelly-idle',
  }[mood];

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ minWidth: 130 }}>
      {/* Speech bubble */}
      <div
        key={key}
        className={cn(
          'relative px-3 py-2 rounded-xl text-xs font-semibold text-center shadow-lg max-w-[160px] leading-snug transition-all duration-200',
          bubbleColor,
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {message}
        <div className={cn(
          'absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[9px] border-transparent',
          bubbleTail
        )} />
      </div>

      {/* Skeleton */}
      <div
        className={cn('cursor-pointer transition-transform', animClass)}
        onClick={handleClick}
        title="Click Skelly"
        style={{ marginTop: 8 }}
      >
        <SkellyBody mood={mood} />
      </div>

      <p className="text-[9px] opacity-30 tracking-wide uppercase font-semibold">tap Skelly</p>

      <style>{`
        @keyframes skelly-bob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .skelly-idle { animation: skelly-bob 3.2s ease-in-out infinite; }

        @keyframes skelly-bounce {
          0%,100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-14px) rotate(-4deg) scale(1.04); }
          70% { transform: translateY(-8px) rotate(4deg) scale(1.02); }
        }
        .skelly-happy { animation: skelly-bounce 0.9s ease-in-out infinite; }

        @keyframes skelly-pop {
          0%,100% { transform: translateY(0) scale(1) rotate(0deg); }
          20% { transform: translateY(-20px) scale(1.07) rotate(-5deg); }
          50% { transform: translateY(-14px) scale(1.04) rotate(5deg); }
          75% { transform: translateY(-18px) scale(1.06) rotate(-3deg); }
        }
        .skelly-celebrating { animation: skelly-pop 0.65s ease-in-out infinite; }

        @keyframes skelly-nod {
          0%,100% { transform: translateY(0) rotate(0deg); }
          40% { transform: translateY(-5px) rotate(-2deg); }
          70% { transform: translateY(-3px) rotate(2deg); }
        }
        .skelly-encourage { animation: skelly-nod 2.2s ease-in-out infinite; }

        @keyframes skelly-shake {
          0%,100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-6px) rotate(-3deg); }
          35% { transform: translateX(6px) rotate(3deg); }
          55% { transform: translateX(-4px) rotate(-2deg); }
          75% { transform: translateX(4px) rotate(2deg); }
          90% { transform: translateX(-2px) rotate(-1deg); }
        }
        .skelly-sad { animation: skelly-shake 2.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

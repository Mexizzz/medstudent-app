'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, RotateCcw, Home, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cn, durationLabel } from '@/lib/utils';

interface SessionResult {
  score: number;
  correctCount: number;
  totalAnswered: number;
  durationSeconds: number;
  responses: Array<{
    questionId: string;
    isCorrect: boolean;
    question: string;
    type: string;
  }>;
}

interface SessionSummaryProps {
  result: SessionResult;
  onRetry: () => void;
}

// ── Score tier config ─────────────────────────────────────────────────────────
type Tier = { label: string; color: string; bg: string; border: string; glow: string; skelly: string; quotes: string[] };

function getTier(score: number): Tier {
  if (score === 100) return {
    label: 'PERFECT',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-300 dark:border-yellow-500/40',
    glow: 'shadow-yellow-200/60 dark:shadow-yellow-500/20',
    skelly: '💀✨',
    quotes: [
      "Is this Prime Messi?",
      "GOAT behavior detected. Unreal.",
      "Your brain just filed a patent.",
      "The textbook is asking YOU for answers now.",
      "Med school? You don't need it. You ARE med school.",
      "100%. I'm framing this.",
      "Skelly is weeping tears of joy. Actual tears.",
      "Your future patients don't know how lucky they are.",
    ],
  };
  if (score >= 90) return {
    label: 'EXCELLENT',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    glow: 'shadow-emerald-200/60 dark:shadow-emerald-500/20',
    skelly: '💀🔥',
    quotes: [
      "Certified genius behavior.",
      "Your neurons are doing backflips.",
      "Almost perfect. The 0.1% is jealous.",
      "Your anatomy prof shed a single tear of joy.",
      "Elite. Absolute elite.",
      "Skelly is doing the death dance in your honour.",
      "This score cures diseases.",
    ],
  };
  if (score >= 75) return {
    label: 'SOLID',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    glow: 'shadow-blue-200/50',
    skelly: '💀👍',
    quotes: [
      "Solid. Very solid.",
      "Your future patients are in safe-ish hands.",
      "Not bad at all, ngl.",
      "Skelly approves. Cautiously.",
      "That's the stuff. More of that.",
      "Good session. Don't ruin it by not reviewing.",
      "You passed the vibe check.",
    ],
  };
  if (score >= 60) return {
    label: 'AVERAGE',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    glow: 'shadow-amber-200/40',
    skelly: '💀😐',
    quotes: [
      "C's get degrees. B's get residency. Think about it.",
      "Average. The textbook respects the effort though.",
      "Room for improvement. But hey, you showed up.",
      "Skelly is giving you the benefit of the doubt.",
      "Halfway there. The other half is crying in the library.",
      "Not fire. Not ice. Just... lukewarm.",
      "Your study group is looking at you differently now.",
    ],
  };
  if (score >= 40) return {
    label: 'STRUGGLING',
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
    glow: '',
    skelly: '💀😬',
    quotes: [
      "Bro... the books are shaking their head.",
      "You answered more wrong than right. The math is not mathing.",
      "Even Skelly looked away. Briefly.",
      "The anatomy ghost of Gray is deeply concerned.",
      "This is fixable. Please fix it.",
      "Your future patients switched doctors preemptively.",
      "Skelly believes in you. Barely. But it counts.",
    ],
  };
  return {
    label: 'YIKES',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    glow: '',
    skelly: '💀😭',
    quotes: [
      "Was you even trying?",
      "The library called. It's filing a missing person's report.",
      "I've seen better scores on a blank page.",
      "Skelly is EMBARRASSED. And he has no feelings.",
      "Please. For the love of medicine. Open. The. Book.",
      "Your textbook cried last night. Again.",
      "Zero patients were harmed in this session... because zero were seen.",
      "Rock bottom? No. This is the basement beneath the basement.",
    ],
  };
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function useConfetti(score: number) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || score < 75) return;
    fired.current = true;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (score === 100) {
        // Epic burst
        const burst = () => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] });
        };
        burst();
        setTimeout(burst, 350);
        setTimeout(burst, 700);
      } else if (score >= 90) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
        setTimeout(() => confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } }), 400);
      } else {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }, [score]);
}

// ── Animated score ring ───────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 130 }: { score: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);
  const strokeColor =
    score === 100 ? '#f59e0b' :
    score >= 90 ? '#10b981' :
    score >= 75 ? '#3b82f6' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444';

  useEffect(() => { const t = setTimeout(() => setProgress(score), 120); return () => clearTimeout(t); }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/30" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={strokeColor} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (progress / 100) * circ}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-black', color)}>{Math.round(score)}%</span>
      </div>
    </div>
  );
}

// ── Animated quote reveal ─────────────────────────────────────────────────────
function QuoteReveal({ quote }: { quote: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 600); return () => clearTimeout(t); }, []);
  return (
    <p
      className="text-base font-bold text-center leading-snug transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
    >
      {quote}
    </p>
  );
}

// ── Skelly mascot reaction ────────────────────────────────────────────────────
function SkellyReaction({ score, skelly }: { score: number; skelly: string }) {
  const animClass = score === 100 ? 'sr-spin' : score >= 90 ? 'sr-bounce' : score >= 75 ? 'sr-nod' : score < 40 ? 'sr-shake' : 'sr-bob';
  return (
    <div className={cn('text-5xl select-none', animClass)} style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
      {skelly}
      <style>{`
        @keyframes sr-spin { 0%,100%{transform:rotate(0deg) scale(1)} 25%{transform:rotate(-15deg) scale(1.15)} 75%{transform:rotate(15deg) scale(1.15)} }
        @keyframes sr-bounce { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-14px)} }
        @keyframes sr-nod { 0%,100%{transform:rotate(0)} 40%{transform:rotate(-8deg)} 70%{transform:rotate(6deg)} }
        @keyframes sr-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes sr-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px) rotate(-4deg)} 40%{transform:translateX(8px) rotate(4deg)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        .sr-spin { animation: sr-spin 1s ease-in-out infinite; }
        .sr-bounce { animation: sr-bounce 0.8s ease-in-out infinite; }
        .sr-nod { animation: sr-nod 2s ease-in-out infinite; }
        .sr-bob { animation: sr-bob 3s ease-in-out infinite; }
        .sr-shake { animation: sr-shake 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SessionSummary({ result, onRetry }: SessionSummaryProps) {
  const { score, correctCount, totalAnswered, durationSeconds } = result;
  const wrongCount = totalAnswered - correctCount;
  const wrongAnswers = result.responses.filter(r => !r.isCorrect);
  const tier = getTier(score);
  const [quote] = useState(() => tier.quotes[Math.floor(Math.random() * tier.quotes.length)]);

  useConfetti(score);

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Main score card */}
      <Card className={cn('border-2 shadow-lg', tier.bg, tier.border, tier.glow)}>
        <CardContent className="p-6 text-center space-y-4">

          {/* Tier label */}
          <div className={cn('text-xs font-black tracking-[0.2em] uppercase', tier.color)}>
            {tier.label}
          </div>

          {/* Skelly + ring side by side */}
          <div className="flex items-center justify-center gap-6">
            <SkellyReaction score={score} skelly={tier.skelly} />
            <ScoreRing score={score} color={tier.color} size={130} />
          </div>

          {/* Funny quote */}
          <QuoteReveal quote={quote} />

          <p className="text-sm text-muted-foreground">
            {correctCount} / {totalAnswered} correct
          </p>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-red-500">{wrongCount}</div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
            <div className="text-base font-bold text-blue-600">{durationLabel(durationSeconds)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Review these {wrongAnswers.length} questions</h3>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {wrongAnswers.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-red-500/80 uppercase tracking-wide">
                    {r.type.replace('_', ' ')}
                  </span>
                  <p className="text-sm text-foreground line-clamp-2 mt-0.5">{r.question}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="gap-2" onClick={onRetry}>
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Retry</span>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/wrong-answers">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Review</span>
          </Link>
        </Button>
        <Button asChild className="gap-2">
          <Link href="/dashboard">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

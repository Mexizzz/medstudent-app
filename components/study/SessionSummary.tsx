'use client';

import { useEffect, useState } from 'react';
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

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const strokeColor = score >= 85 ? '#10b981' : score >= 65 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/30" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black">{Math.round(score)}%</span>
      </div>
    </div>
  );
}

export function SessionSummary({ result, onRetry }: SessionSummaryProps) {
  const { score, correctCount, totalAnswered, durationSeconds } = result;
  const wrongCount = totalAnswered - correctCount;
  const wrongAnswers = result.responses.filter(r => !r.isCorrect);

  const scoreConfig = score >= 85
    ? { emoji: '🏆', msg: 'Excellent work!', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' }
    : score >= 65
    ? { emoji: '👍', msg: 'Good job!', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' }
    : score >= 40
    ? { emoji: '📚', msg: 'Keep studying!', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' }
    : { emoji: '💪', msg: 'Keep going!', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score header */}
      <Card className={cn('border', scoreConfig.bg)}>
        <CardContent className="p-6 text-center space-y-3">
          <div className="text-4xl mb-1">{scoreConfig.emoji}</div>
          <h2 className={cn('text-xl font-bold', scoreConfig.color)}>{scoreConfig.msg}</h2>
          <div className="flex justify-center">
            <ScoreRing score={score} size={130} />
          </div>
          <p className="text-sm text-muted-foreground">
            {correctCount} correct out of {totalAnswered} questions
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
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
            <div className="text-2xl font-bold text-blue-600 text-base">{durationLabel(durationSeconds)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Wrong answers */}
      {wrongAnswers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Review these questions</h3>
            <span className="text-xs text-muted-foreground">{wrongAnswers.length} to review</span>
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

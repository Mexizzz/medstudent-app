'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityRouter } from '@/components/study/ActivityRouter';
import { SessionSummary } from '@/components/study/SessionSummary';
import { QuestionTransition } from '@/components/study/QuestionTransition';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, X, Loader2, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { AddToFolderButton } from '@/components/study/AddToFolderButton';
import { cn, ACTIVITY_LABELS, subjectColor, durationLabel } from '@/lib/utils';
import { toast } from 'sonner';
import type { Question } from '@/db/schema';

async function fireMilestoneConfetti(type: 'levelup' | 'streak') {
  const { default: confetti } = await import('canvas-confetti');
  if (type === 'levelup') {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 }, colors: ['#8b5cf6', '#6d28d9', '#fbbf24', '#fff'] });
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 350);
  } else {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#f97316', '#fbbf24', '#fff'] });
  }
}

interface SessionResponse {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  aiScore?: number;
  aiFeedback?: string;
  timeSpentSecs?: number;
  subject?: string | null;
  topic?: string | null;
  question?: string;
  type?: string;
}

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

export default function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const timerSecs = searchParams ? parseInt(searchParams.get('timerSecs') ?? '0') : 0;
  const timedMode = timerSecs > 0;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [responses, setResponses] = useState<SessionResponse[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startTime = useRef(Date.now());
  const questionStartTime = useRef(Date.now());

  // Explain Like a Professor
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions ?? []);
        questionStartTime.current = Date.now();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(isCorrect: boolean, answer: string, aiScore?: number, aiFeedback?: string) {
    const timeSpentSecs = Math.round((Date.now() - questionStartTime.current) / 1000);
    setResponses(prev => [...prev, {
      questionId: current.id,
      userAnswer: answer,
      isCorrect,
      aiScore,
      aiFeedback,
      timeSpentSecs,
      subject: current.subject,
      topic: current.topic,
      question: current.question || current.front || current.blankText || current.caseQuestion || '',
      type: current.type,
    }]);
    setAnswered(true);
  }

  // Countdown timer for timed mode
  useEffect(() => {
    if (!timedMode || answered || !current) return;
    setTimeLeft(timerSecs);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-answer as wrong when time runs out
          if (!answered) handleAnswer(false, '', undefined, undefined);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, timedMode, answered]);

  // Keyboard shortcut: Enter advances to next when answered
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!answered || submitting) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, submitting, isLast, responses]);

  async function handleExplain() {
    if (explainOpen) { setExplainOpen(false); return; }
    if (explainText) { setExplainOpen(true); return; }
    setExplainOpen(true);
    setExplainLoading(true);
    setExplainText('');
    try {
      const res = await fetch(`/api/questions/${current.id}/explain`, { method: 'POST' });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExplainText(text);
      }
    } catch { setExplainText('Failed to load explanation. Please try again.'); }
    finally { setExplainLoading(false); }
  }

  async function handleNext() {
    setExplainOpen(false);
    setExplainText('');
    if (isLast) {
      // Submit session
      setSubmitting(true);
      try {
        const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
        const res = await fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses, durationSeconds }),
        });
        const data = await res.json();
        setResult({
          ...data,
          durationSeconds,
          totalAnswered: responses.length,
          responses: responses.map(r => ({
            questionId: r.questionId,
            isCorrect: r.isCorrect,
            question: r.question ?? '',
            type: r.type ?? '',
          })),
        });
        if (data.xpEarned) {
          const { xpEarned, xpProgress, rankChanged } = data;
          if (rankChanged) {
            fireMilestoneConfetti('levelup');
            toast.success(
              `LEVEL UP! ${xpProgress?.rank?.badge ?? ''} ${xpProgress?.rank?.title ?? ''} — +${xpEarned} XP`,
              { duration: 7000 }
            );
          } else {
            toast.success(
              `+${xpEarned} XP earned! ${xpProgress?.rank?.badge ?? ''} ${xpProgress?.rank?.title ?? ''}`,
              { duration: 4000 }
            );
          }
        }
        // Streak milestone celebration
        if (data.streakInfo?.currentStreak) {
          const s = data.streakInfo.currentStreak;
          if ([7, 14, 30, 60, 100].includes(s)) {
            fireMilestoneConfetti('streak');
            toast.success(`🔥 ${s}-day streak! You're unstoppable.`, { duration: 6000 });
          }
        }
      } catch {}
      setSubmitting(false);
    } else {
      setCurrentIndex(i => i + 1);
      setAnswered(false);
      questionStartTime.current = Date.now();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SessionSummary
          result={result}
          onRetry={() => router.push('/study')}
        />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Session not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <a href="/study">Back to Study</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => router.push('/study')}>
          <X className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{currentIndex + 1} / {questions.length}</span>
            {timedMode && timeLeft !== null && !answered ? (
              <span className={cn(
                'font-bold tabular-nums px-2 py-0.5 rounded-md transition-colors',
                timeLeft <= 5 ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse' :
                timeLeft <= 10 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' :
                'bg-muted text-muted-foreground'
              )}>
                ⏱ {timeLeft}s
              </span>
            ) : (
              <span>{Math.round(progress)}%</span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          {timedMode && timeLeft !== null && !answered && (
            <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-500' : 'bg-blue-500')}
                style={{ width: `${(timeLeft / timerSecs) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Question meta */}
      <div className="flex items-center gap-2">
        {current.subject && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', subjectColor(current.subject))}>
            {current.subject}
          </span>
        )}
        {current.topic && <span className="text-xs text-muted-foreground">{current.topic}</span>}
        {current.difficulty && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            current.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
            current.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
            'bg-muted text-muted-foreground'
          )}>
            {current.difficulty}
          </span>
        )}
        <div className="ml-auto">
          <AddToFolderButton questionId={current.id} />
        </div>
      </div>

      {/* Question card */}
      <QuestionTransition transitionKey={currentIndex}>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <ActivityRouter question={current} onAnswer={handleAnswer} />
          </CardContent>
        </Card>
      </QuestionTransition>

      {/* Explain Like a Professor */}
      {answered && (current.type === 'mcq' || current.type === 'clinical_case' || current.type === 'flashcard') && (
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={handleExplain}
            disabled={explainLoading}
            className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            {explainLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Loading professor explanation…</>
              : explainOpen
              ? <><ChevronUp className="w-4 h-4" />Hide Professor Explanation</>
              : <><GraduationCap className="w-4 h-4" />Explain Like a Professor</>}
          </Button>

          {explainOpen && explainText && (
            <Card className="border-violet-100 bg-violet-50/40">
              <CardContent className="p-4 text-sm text-foreground leading-relaxed space-y-3">
                {explainText.split(/\n(?=## )/).map((section, i) => {
                  const [header, ...body] = section.split('\n');
                  const heading = header.replace(/^## /, '');
                  const content = body.join('\n').trim();
                  return (
                    <div key={i}>
                      {heading && <p className="font-semibold text-violet-800 text-xs uppercase tracking-wide mb-1">{heading}</p>}
                      <p className="whitespace-pre-line">{content || section}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Next button */}
      {answered && (
        <div className="space-y-1">
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="w-full gap-2 py-5"
            size="lg"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : isLast ? (
              'Finish Session'
            ) : (
              <><span>Next Question</span><ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground/50">Press Enter to continue · 1-4 to pick answer</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, GraduationCap, Timer, Flag, CheckCircle2, XCircle, ChevronRight, RotateCcw, Sparkles, Lock, Clock } from 'lucide-react';
import { cn, subjectColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Question } from '@/db/schema';
import { TierBadge } from '@/components/ui/TierBadge';

const EXAM_TYPES = [
  { id: 'usmle1', label: 'USMLE Step 1', questions: 40, minutes: 60 },
  { id: 'usmle2', label: 'USMLE Step 2 CK', questions: 40, minutes: 60 },
  { id: 'plab',   label: 'PLAB',           questions: 30, minutes: 45 },
  { id: 'ifom',   label: 'IFOM',           questions: 40, minutes: 60 },
  { id: 'custom', label: 'Custom Practice', questions: 20, minutes: 30 },
];

interface Source {
  id: string;
  title: string;
  subject?: string | null;
  questionCounts: { type: string; count: number }[];
}

type Phase = 'config' | 'exam' | 'review';

function getPercentile(score: number): string {
  if (score >= 90) return 'Top 10% · ≥240 equivalent';
  if (score >= 75) return 'Top 25% · 220–239 equivalent';
  if (score >= 60) return 'Pass range · 196–219 equivalent';
  return 'Below passing · <196 equivalent';
}

function useTimer(startMins: number, active: boolean, onExpire: () => void) {
  const [secsLeft, setSecsLeft] = useState(startMins * 60);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(id); cb.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  return { secsLeft, display: `${mins}:${secs.toString().padStart(2, '0')}` };
}

export default function ExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('config');

  // Config state
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [examTypeId, setExamTypeId] = useState('usmle1');
  const [starting, setStarting] = useState(false);

  // Exam state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const startTime = useRef(Date.now());

  // Review state
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Tier & features
  const [tier, setTier] = useState<string>('free');
  const [perQuestionTimer, setPerQuestionTimer] = useState(false);
  const [perQuestionSecs, setPerQuestionSecs] = useState(90);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(90);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(setSources)
      .catch(() => {})
      .finally(() => setLoadingSources(false));
    fetch('/api/subscription')
      .then(r => r.json())
      .then(d => setTier(d.tier || 'free'))
      .catch(() => {});
  }, []);

  const examType = EXAM_TYPES.find(e => e.id === examTypeId) ?? EXAM_TYPES[0];

  const { display: timeDisplay, secsLeft } = useTimer(
    examType.minutes,
    phase === 'exam',
    () => handleSubmit(true)
  );

  // Per-question timer
  useEffect(() => {
    if (phase !== 'exam' || !perQuestionTimer) return;
    setQuestionTimeLeft(perQuestionSecs);
    const id = setInterval(() => {
      setQuestionTimeLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          // Auto-advance or submit
          if (currentIndex < questions.length - 1) {
            setSelectedOption(answers[questions[currentIndex + 1]?.id] ?? null);
            setCurrentIndex(i => i + 1);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, perQuestionTimer, currentIndex, perQuestionSecs]);

  const current = questions[currentIndex];
  const totalQ = questions.length;

  async function loadAiExplanation(questionId: string) {
    if (aiExplanations[questionId] || loadingExplanation) return;
    setLoadingExplanation(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/explain`, { method: 'POST' });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiExplanations(prev => ({ ...prev, [questionId]: text }));
      }
    } catch {
      toast.error('Failed to get AI explanation');
    }
    setLoadingExplanation(null);
  }

  async function handleStart() {
    if (!selectedSources.length) { toast.error('Select at least one source'); return; }
    setStarting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: selectedSources,
          activityTypes: ['mcq'],
          count: examType.questions,
          mode: 'exam',
          examType: examType.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setSessionId(data.sessionId);
      startTime.current = Date.now();
      setPhase('exam');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start exam');
    }
    setStarting(false);
  }

  function selectOption(opt: string) {
    if (!current) return;
    setSelectedOption(opt);
    setAnswers(prev => ({ ...prev, [current.id]: opt }));
  }

  function toggleFlag() {
    if (!current) return;
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(current.id) ? next.delete(current.id) : next.add(current.id);
      return next;
    });
  }

  function goNext() {
    setSelectedOption(answers[questions[currentIndex + 1]?.id] ?? null);
    setCurrentIndex(i => Math.min(i + 1, totalQ - 1));
  }

  function goPrev() {
    setSelectedOption(answers[questions[currentIndex - 1]?.id] ?? null);
    setCurrentIndex(i => Math.max(i - 1, 0));
  }

  async function handleSubmit(expired = false) {
    if (phase !== 'exam') return;
    setSubmitting(true);
    const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);

    const responses = questions.map(q => {
      const userAnswer = answers[q.id] ?? '';
      const isCorrect = userAnswer === q.correctAnswer;
      return {
        questionId: q.id,
        userAnswer,
        isCorrect,
        subject: q.subject,
        topic: q.topic,
      };
    });

    try {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, durationSeconds }),
      });
      const data = await res.json();
      setScore(data.score ?? 0);
      setCorrectCount(data.correctCount ?? 0);
    } catch {}

    setSubmitting(false);
    setPhase('review');
    setReviewIndex(0);
    if (expired) toast.info("Time's up! Exam submitted automatically.");
  }

  // ── Config screen ─────────────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <GraduationCap className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Mode</h1>
            <p className="text-muted-foreground text-sm">Simulate a real exam — no feedback during the session</p>
          </div>
        </div>

        {/* Exam type */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Exam Type</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {EXAM_TYPES.map(et => (
              <label key={et.id} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                examTypeId === et.id ? 'bg-violet-50 border-violet-300' : 'hover:bg-muted border-border'
              )}>
                <input type="radio" name="examType" value={et.id} checked={examTypeId === et.id}
                  onChange={() => setExamTypeId(et.id)} className="accent-violet-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{et.label}</p>
                  <p className="text-xs text-muted-foreground">{et.questions} questions · {et.minutes} min</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Per-question timer (Pro+) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Per-Question Timer</p>
                  <p className="text-xs text-muted-foreground">Countdown for each question individually</p>
                </div>
              </div>
              {tier === 'free' ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> <TierBadge tier="pro" size="sm" />
                </span>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={perQuestionTimer} onChange={e => setPerQuestionTimer(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-violet-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              )}
            </div>
            {perQuestionTimer && tier !== 'free' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Seconds per question:</span>
                <select value={perQuestionSecs} onChange={e => setPerQuestionSecs(Number(e.target.value))}
                  className="text-sm border border-border rounded-lg px-2 py-1 bg-background">
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                  <option value={180}>180s</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source selection */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Content Sources</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loadingSources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sources…
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No sources yet. Add content in Library first.</p>
            ) : sources.map(s => {
              const mcqCount = s.questionCounts.find(c => c.type === 'mcq')?.count ?? 0;
              return (
                <label key={s.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedSources.includes(s.id) ? 'bg-violet-50 border-violet-300' : 'hover:bg-muted border-border',
                  mcqCount === 0 && 'opacity-40'
                )}>
                  <input type="checkbox" checked={selectedSources.includes(s.id)}
                    disabled={mcqCount === 0}
                    onChange={() => setSelectedSources(prev =>
                      prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                    )} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{mcqCount} MCQs</p>
                  </div>
                  {s.subject && (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', subjectColor(s.subject))}>
                      {s.subject}
                    </span>
                  )}
                </label>
              );
            })}
          </CardContent>
        </Card>

        <Button onClick={handleStart} disabled={starting || !selectedSources.length}
          className="w-full gap-2 py-6 text-base bg-violet-600 hover:bg-violet-700" size="lg">
          {starting ? <><Loader2 className="w-5 h-5 animate-spin" />Starting…</>
            : <><GraduationCap className="w-5 h-5" />Start Exam</>}
        </Button>
      </div>
    );
  }

  // ── Review screen ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    const percentile = getPercentile(score);
    const reviewQ = questions[reviewIndex];
    const userAns = answers[reviewQ?.id] ?? '';
    const isCorrect = userAns === reviewQ?.correctAnswer;

    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* Score card */}
        <Card className={cn('border-2', score >= 60 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/20')}>
          <CardContent className="p-6 text-center space-y-2">
            <GraduationCap className={cn('w-10 h-10 mx-auto', score >= 60 ? 'text-emerald-500' : 'text-red-400')} />
            <p className="text-4xl font-bold">{Math.round(score)}%</p>
            <p className="text-muted-foreground text-sm">{correctCount} / {totalQ} correct</p>
            <Badge variant="outline" className="text-xs">{percentile}</Badge>
            <p className="text-xs text-muted-foreground mt-1">Exam type: {examType.label}</p>
          </CardContent>
        </Card>

        {/* Question review */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Review Questions</h2>
          <span className="text-xs text-muted-foreground">{reviewIndex + 1} / {totalQ}</span>
        </div>

        {reviewQ && (
          <Card className={cn('border', isCorrect ? 'border-emerald-200' : 'border-red-200')}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                {isCorrect
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                <p className="text-sm font-medium leading-relaxed">{reviewQ.question}</p>
              </div>

              <div className="space-y-2">
                {(['A', 'B', 'C', 'D'] as const).map(letter => {
                  const text = reviewQ[`option${letter}` as keyof typeof reviewQ] as string | null;
                  if (!text) return null;
                  const isCorrectOpt = reviewQ.correctAnswer === letter;
                  const isUserOpt = userAns === letter;
                  return (
                    <div key={letter} className={cn(
                      'flex items-start gap-2 p-2.5 rounded-lg text-sm border',
                      isCorrectOpt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                      isUserOpt && !isCorrectOpt ? 'bg-red-50 border-red-200 text-red-700' :
                      'border-transparent text-muted-foreground'
                    )}>
                      <span className="font-bold shrink-0 w-5">{letter})</span>
                      <span>{text}</span>
                      {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0 mt-0.5" />}
                      {isUserOpt && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              {reviewQ.explanation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                  <p className="text-xs text-blue-700 leading-relaxed">{reviewQ.explanation}</p>
                </div>
              )}

              {/* AI Explanation (Pro+) */}
              {tier !== 'free' ? (
                aiExplanations[reviewQ.id] ? (
                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                    <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Explanation
                    </p>
                    <p className="text-xs text-violet-700 leading-relaxed whitespace-pre-wrap">{aiExplanations[reviewQ.id]}</p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => loadAiExplanation(reviewQ.id)}
                    disabled={loadingExplanation === reviewQ.id}
                  >
                    {loadingExplanation === reviewQ.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      : <><Sparkles className="w-3.5 h-3.5" /> AI Explain This Answer</>}
                  </Button>
                )
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <Lock className="w-3 h-3" /> AI Explanations available with <TierBadge tier="pro" size="sm" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setReviewIndex(i => Math.max(0, i - 1))}
            disabled={reviewIndex === 0} className="flex-1">← Prev</Button>
          <Button variant="outline" onClick={() => setReviewIndex(i => Math.min(totalQ - 1, i + 1))}
            disabled={reviewIndex === totalQ - 1} className="flex-1">Next →</Button>
        </div>

        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => {
          setPhase('config'); setQuestions([]); setAnswers({}); setFlagged(new Set()); setCurrentIndex(0);
        }}>
          <RotateCcw className="w-4 h-4" /> New Exam
        </Button>
      </div>
    );
  }

  // ── Exam screen ───────────────────────────────────────────────────────────
  if (!current) return null;
  const opts = ['A', 'B', 'C', 'D'] as const;
  const isFlagged = flagged.has(current.id);
  const answered = !!answers[current.id];

  return (
    <div className="flex flex-col h-screen">
      {/* Exam header */}
      <div className="shrink-0 bg-card border-b border-border px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="w-4 h-4 text-violet-500" />
          <span className="font-medium text-violet-700">{examType.label}</span>
        </div>
        <div className="flex-1">
          <Progress value={(currentIndex / totalQ) * 100} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{currentIndex + 1}/{totalQ}</span>
        {perQuestionTimer && (
          <div className={cn(
            'flex items-center gap-1.5 text-sm font-mono font-medium px-3 py-1 rounded-full',
            questionTimeLeft < 15 ? 'bg-red-100 text-red-600 animate-pulse' : questionTimeLeft < 30 ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'
          )}>
            <Clock className="w-3.5 h-3.5" />
            {questionTimeLeft}s
          </div>
        )}
        <div className={cn(
          'flex items-center gap-1.5 text-sm font-mono font-medium px-3 py-1 rounded-full',
          secsLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
        )}>
          <Timer className="w-3.5 h-3.5" />
          {timeDisplay}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-4">
        {/* Meta */}
        <div className="flex items-center gap-2">
          {current.subject && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', subjectColor(current.subject))}>
              {current.subject}
            </span>
          )}
          <button onClick={toggleFlag} className={cn(
            'ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors',
            isFlagged ? 'bg-amber-100 text-amber-700' : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50'
          )}>
            <Flag className="w-3.5 h-3.5" />
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>

        {/* Question */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm leading-relaxed font-medium text-foreground">{current.question}</p>

            <div className="space-y-2">
              {opts.map(letter => {
                const text = current[`option${letter}` as keyof typeof current] as string | null;
                if (!text) return null;
                const selected = answers[current.id] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => selectOption(letter)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-xl border text-sm text-left transition-all',
                      selected
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-violet-300 hover:bg-violet-50'
                    )}
                  >
                    <span className={cn('font-bold shrink-0 w-5', selected ? 'text-white' : 'text-violet-600')}>
                      {letter})
                    </span>
                    <span>{text}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation footer */}
      <div className="shrink-0 bg-card border-t border-border px-6 py-4 flex items-center gap-3">
        <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>← Prev</Button>
        <div className="flex-1 flex gap-1 overflow-x-auto">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => { setCurrentIndex(i); setSelectedOption(answers[q.id] ?? null); }}
              className={cn(
                'w-7 h-7 rounded text-xs font-medium shrink-0 transition-colors',
                i === currentIndex ? 'bg-violet-600 text-white' :
                flagged.has(q.id) ? 'bg-amber-200 text-amber-700' :
                answers[q.id] ? 'bg-emerald-100 text-emerald-700' :
                'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {currentIndex < totalQ - 1 ? (
          <Button onClick={goNext} className="bg-violet-600 hover:bg-violet-700">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={() => handleSubmit(false)} disabled={submitting}
            className="bg-violet-600 hover:bg-violet-700 gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Exam'}
          </Button>
        )}
      </div>
    </div>
  );
}

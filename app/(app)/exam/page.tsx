'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, GraduationCap, Timer, Flag, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { cn, subjectColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Question } from '@/db/schema';

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

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(setSources)
      .catch(() => {})
      .finally(() => setLoadingSources(false));
  }, []);

  const examType = EXAM_TYPES.find(e => e.id === examTypeId) ?? EXAM_TYPES[0];

  const { display: timeDisplay, secsLeft } = useTimer(
    examType.minutes,
    phase === 'exam',
    () => handleSubmit(true)
  );

  const current = questions[currentIndex];
  const totalQ = questions.length;

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
            <h1 className="text-2xl font-bold text-slate-800">Exam Mode</h1>
            <p className="text-slate-500 text-sm">Simulate a real exam — no feedback during the session</p>
          </div>
        </div>

        {/* Exam type */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Exam Type</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {EXAM_TYPES.map(et => (
              <label key={et.id} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                examTypeId === et.id ? 'bg-violet-50 border-violet-300' : 'hover:bg-slate-50 border-slate-200'
              )}>
                <input type="radio" name="examType" value={et.id} checked={examTypeId === et.id}
                  onChange={() => setExamTypeId(et.id)} className="accent-violet-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{et.label}</p>
                  <p className="text-xs text-slate-400">{et.questions} questions · {et.minutes} min</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Source selection */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Content Sources</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loadingSources ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sources…
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No sources yet. Add content in Library first.</p>
            ) : sources.map(s => {
              const mcqCount = s.questionCounts.find(c => c.type === 'mcq')?.count ?? 0;
              return (
                <label key={s.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedSources.includes(s.id) ? 'bg-violet-50 border-violet-300' : 'hover:bg-slate-50 border-slate-200',
                  mcqCount === 0 && 'opacity-40'
                )}>
                  <input type="checkbox" checked={selectedSources.includes(s.id)}
                    disabled={mcqCount === 0}
                    onChange={() => setSelectedSources(prev =>
                      prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                    )} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">{mcqCount} MCQs</p>
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
            <p className="text-slate-600 text-sm">{correctCount} / {totalQ} correct</p>
            <Badge variant="outline" className="text-xs">{percentile}</Badge>
            <p className="text-xs text-slate-400 mt-1">Exam type: {examType.label}</p>
          </CardContent>
        </Card>

        {/* Question review */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">Review Questions</h2>
          <span className="text-xs text-slate-400">{reviewIndex + 1} / {totalQ}</span>
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
                      'border-transparent text-slate-500'
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
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setReviewIndex(i => Math.max(0, i - 1))}
            disabled={reviewIndex === 0} className="flex-1">← Prev</Button>
          <Button variant="outline" onClick={() => setReviewIndex(i => Math.min(totalQ - 1, i + 1))}
            disabled={reviewIndex === totalQ - 1} className="flex-1">Next →</Button>
        </div>

        <Button variant="ghost" className="w-full gap-2 text-slate-500" onClick={() => {
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
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <GraduationCap className="w-4 h-4 text-violet-500" />
          <span className="font-medium text-violet-700">{examType.label}</span>
        </div>
        <div className="flex-1">
          <Progress value={(currentIndex / totalQ) * 100} className="h-2" />
        </div>
        <span className="text-xs text-slate-500">{currentIndex + 1}/{totalQ}</span>
        <div className={cn(
          'flex items-center gap-1.5 text-sm font-mono font-medium px-3 py-1 rounded-full',
          secsLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
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
            isFlagged ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
          )}>
            <Flag className="w-3.5 h-3.5" />
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>

        {/* Question */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm leading-relaxed font-medium text-slate-800">{current.question}</p>

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
                        : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
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
      <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center gap-3">
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
                'bg-slate-100 text-slate-500'
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

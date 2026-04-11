'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Trophy, Users, Lightbulb, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Challenge {
  date: string;
  question: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string | null;
    correctAnswer?: string;
    explanation?: string;
    subject: string | null;
    topic: string | null;
    difficulty: string | null;
  };
  correctAnswer?: string;
  explanation?: string;
  globalPct: number | null;
  totalResponses: number;
  userAnswered: boolean;
  userCorrect: boolean | null;
}

function storageKey(date: string) { return `dc_answered_${date}`; }

export default function DailyChallengePage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation?: string; globalPct: number; totalResponses: number } | null>(null);

  useEffect(() => {
    fetch('/api/daily-challenge')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setChallenge(data);
        // Check localStorage for already answered
        const done = localStorage.getItem(storageKey(data.date));
        if (done || data.userAnswered) setSubmitted(true);
      })
      .catch(() => setError('Failed to load challenge'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!selected || !challenge) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/daily-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: challenge.question.id, answer: selected }),
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      localStorage.setItem(storageKey(challenge.date), selected);
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  const options = challenge ? [
    { key: 'A', text: challenge.question.optionA },
    { key: 'B', text: challenge.question.optionB },
    { key: 'C', text: challenge.question.optionC },
    { key: 'D', text: challenge.question.optionD },
  ].filter(o => o.text) : [];

  const correctAnswer = result?.correctAnswer ?? challenge?.correctAnswer;
  const isCorrect = result?.isCorrect ?? challenge?.userCorrect ?? false;
  const globalPct = result?.globalPct ?? challenge?.globalPct;
  const totalResponses = result?.totalResponses ?? challenge?.totalResponses ?? 0;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
          <Trophy className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Challenge</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {challenge ? new Date(challenge.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild variant="outline" size="sm"><Link href="/library">Go generate some MCQs first</Link></Button>
          </CardContent>
        </Card>
      ) : challenge && (
        <>
          {/* Question card */}
          <Card className={cn(
            'border-2 transition-colors',
            submitted && isCorrect ? 'border-emerald-200 dark:border-emerald-500/30' :
            submitted && !isCorrect ? 'border-red-200 dark:border-red-500/30' :
            'border-amber-200 dark:border-amber-500/30'
          )}>
            <CardContent className="p-5 space-y-4">
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
                  Question of the Day
                </span>
                {challenge.question.subject && (
                  <span className="text-xs text-muted-foreground">{challenge.question.subject}</span>
                )}
                {challenge.question.difficulty && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded',
                    challenge.question.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                    challenge.question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-muted text-muted-foreground'
                  )}>{challenge.question.difficulty}</span>
                )}
              </div>

              {/* Question text */}
              <p className="text-base font-medium leading-relaxed">{challenge.question.question}</p>

              {/* Options */}
              <div className="space-y-2.5">
                {options.map(({ key, text }) => {
                  const isCorrectOption = correctAnswer === key;
                  const isSelectedOption = selected === key;
                  let cls = '';
                  if (submitted) {
                    if (isCorrectOption) cls = 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300';
                    else if (isSelectedOption) cls = 'bg-red-50 border-red-400 text-red-800 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-300';
                    else cls = 'border-border text-muted-foreground opacity-50';
                  } else {
                    cls = isSelectedOption ? 'bg-primary/5 border-primary' : 'border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
                  }
                  return (
                    <button
                      key={key}
                      disabled={submitted}
                      onClick={() => !submitted && setSelected(key)}
                      className={cn('w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all text-sm', cls)}
                    >
                      <span className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                        submitted && isCorrectOption ? 'bg-emerald-500 text-white' :
                        submitted && isSelectedOption ? 'bg-red-500 text-white' :
                        isSelectedOption ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      )}>{key}</span>
                      <span className="flex-1 leading-snug">{text}</span>
                      {submitted && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      {submitted && isSelectedOption && !isCorrectOption && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Submit */}
              {!submitted && (
                <Button onClick={handleSubmit} disabled={!selected || submitting} className="w-full h-11">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Answer'}
                </Button>
              )}

              {/* Result banner */}
              {submitted && (
                <div className={cn(
                  'flex items-center gap-2 p-3.5 rounded-xl border text-sm font-semibold',
                  isCorrect
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                )}>
                  {isCorrect
                    ? <><CheckCircle2 className="w-5 h-5" /> Correct! Well done.</>
                    : <><XCircle className="w-5 h-5" /> Incorrect — Answer: <strong>{correctAnswer}</strong></>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Explanation */}
          {submitted && (challenge.explanation || result?.explanation) && (
            <Card className="border-violet-100 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Explanation</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{challenge.explanation ?? result?.explanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Global stats */}
          {submitted && globalPct !== null && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      <span className="text-2xl font-black text-blue-600">{globalPct}%</span> of students got this right
                    </p>
                    <p className="text-xs text-muted-foreground">{totalResponses} response{totalResponses !== 1 ? 's' : ''} total</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${globalPct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Come back tomorrow */}
          {submitted && (
            <div className="text-center space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline" size="sm"><Link href="/study">Study More</Link></Button>
                <Button asChild size="sm"><Link href="/dashboard">Dashboard</Link></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityRouter } from '@/components/study/ActivityRouter';
import { SessionSummary } from '@/components/study/SessionSummary';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, X, Loader2, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, ACTIVITY_LABELS, subjectColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Question } from '@/db/schema';

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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [responses, setResponses] = useState<SessionResponse[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
          const { xpEarned, xpProgress } = data;
          toast.success(
            `+${xpEarned} XP earned! ${xpProgress?.rank?.badge ?? ''} ${xpProgress?.rank?.title ?? ''}`,
            { duration: 5000 }
          );
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
      <div className="p-6 max-w-2xl mx-auto">
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
        <p className="text-slate-500">Session not found.</p>
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
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400" onClick={() => router.push('/study')}>
          <X className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{currentIndex + 1} / {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Question meta */}
      <div className="flex items-center gap-2">
        {current.subject && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', subjectColor(current.subject))}>
            {current.subject}
          </span>
        )}
        {current.topic && <span className="text-xs text-slate-400">{current.topic}</span>}
        {current.difficulty && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            current.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
            current.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
            'bg-slate-100 text-slate-500'
          )}>
            {current.difficulty}
          </span>
        )}
      </div>

      {/* Question card */}
      <Card key={current.id} className="shadow-sm">
        <CardContent className="p-5">
          <ActivityRouter question={current} onAnswer={handleAnswer} />
        </CardContent>
      </Card>

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
              <CardContent className="p-4 text-sm text-slate-700 leading-relaxed space-y-3">
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
      )}
    </div>
  );
}

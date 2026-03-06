'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn, scoreLabel } from '@/lib/utils';
import type { Question } from '@/db/schema';

interface ShortAnswerCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string, aiScore?: number, aiFeedback?: string) => void;
}

interface EvalResult {
  score: number;
  coveredPoints: string[];
  missingPoints: string[];
  feedback: string;
  grade: string;
}

export function ShortAnswerCard({ question, onAnswer }: ShortAnswerCardProps) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const keyPoints: string[] = question.keyPoints ? JSON.parse(question.keyPoints) : [];

  async function handleSubmit() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evaluate/short-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, userAnswer: answer }),
      });
      const data: EvalResult = await res.json();
      setResult(data);
      onAnswer(data.score >= 0.65, answer, data.score, data.feedback);
    } catch {
      // If API fails, just mark as submitted without grading
      onAnswer(false, answer);
    } finally {
      setLoading(false);
    }
  }

  const gradeColor = result
    ? result.score >= 0.85 ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
    : result.score >= 0.65 ? 'bg-blue-50 border-blue-300 text-blue-800'
    : result.score >= 0.40 ? 'bg-amber-50 border-amber-300 text-amber-800'
    : 'bg-red-50 border-red-300 text-red-800'
    : '';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="shrink-0">Short Answer</Badge>
        <p className="text-base font-medium leading-relaxed">{question.question}</p>
      </div>

      {keyPoints.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Key points to cover</p>
          <ul className="space-y-1">
            {keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-400 mt-0.5">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your answer here..."
        className="min-h-[120px] text-sm"
        disabled={!!result || loading}
      />

      {!result && (
        <Button onClick={handleSubmit} disabled={!answer.trim() || loading} className="w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Grading with AI...</>
          ) : 'Submit for AI Grading'}
        </Button>
      )}

      {result && (
        <div className="space-y-3">
          <div className={cn('p-4 rounded-lg border', gradeColor)}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{result.grade}</span>
              <span className="text-sm font-semibold">{Math.round(result.score * 100)}%</span>
            </div>
            <p className="text-sm">{result.feedback}</p>
          </div>

          {result.coveredPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Covered</p>
              <ul className="space-y-1">
                {result.coveredPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-emerald-500 mt-0.5">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missingPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase mb-1">Missing</p>
              <ul className="space-y-1">
                {result.missingPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-red-400 mt-0.5">✗</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {question.modelAnswer && (
            <div className="bg-muted border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Model Answer</p>
              <p className="text-sm text-foreground leading-relaxed">{question.modelAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

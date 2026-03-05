'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/db/schema';

interface FillBlankCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string) => void;
}

export function FillBlankCard({ question, onAnswer }: FillBlankCardProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const alternatives: string[] = question.alternativeAnswers
    ? JSON.parse(question.alternativeAnswers)
    : [];

  const allAccepted = [
    question.blankAnswer?.toLowerCase() ?? '',
    ...alternatives.map(a => a.toLowerCase()),
  ];

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const correct = allAccepted.includes(trimmed.toLowerCase());
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(correct, trimmed);
  }

  // Split the blank text around [BLANK]
  const parts = (question.blankText ?? '').split('[BLANK]');

  return (
    <div className="space-y-5">
      <Badge variant="outline">Fill in the Blank</Badge>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <p className="text-base leading-8 text-slate-800">
          {parts[0]}
          {submitted ? (
            <span className={cn(
              'inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded font-semibold text-sm',
              isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}>
              {input}
              {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <span className="inline-block mx-1 w-28 border-b-2 border-blue-400" />
          )}
          {parts[1]}
        </p>
      </div>

      {!submitted && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer..."
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleSubmit} disabled={!input.trim()}>Submit</Button>
        </div>
      )}

      {submitted && (
        <div className={cn(
          'rounded-lg border p-4 space-y-2',
          isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            {isCorrect
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">Correct!</span></>
              : <><XCircle className="w-4 h-4 text-red-600" /><span className="text-red-700">Incorrect</span></>
            }
          </div>
          {!isCorrect && (
            <p className="text-sm text-slate-700">
              Correct answer: <strong>{question.blankAnswer}</strong>
              {alternatives.length > 0 && ` (also accepted: ${alternatives.join(', ')})`}
            </p>
          )}
          {question.explanation && (
            <p className="text-sm text-slate-600 border-t border-current/10 pt-2 mt-2">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

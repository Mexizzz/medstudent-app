'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/db/schema';

interface MCQCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string) => void;
}

export function MCQCard({ question, onAnswer }: MCQCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = [
    { key: 'A', text: question.optionA },
    { key: 'B', text: question.optionB },
    { key: 'C', text: question.optionC },
    { key: 'D', text: question.optionD },
  ].filter(o => o.text);

  const isCorrect = submitted && selected === question.correctAnswer;

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
    onAnswer(selected === question.correctAnswer, selected);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="shrink-0 mt-0.5">MCQ</Badge>
        <p className="text-base font-medium leading-relaxed">{question.question}</p>
      </div>

      <div className="space-y-2.5">
        {options.map(({ key, text }) => {
          const isCorrectOption = question.correctAnswer === key;
          const isSelectedOption = selected === key;
          let variant = '';
          if (submitted) {
            if (isCorrectOption) variant = 'bg-emerald-50 border-emerald-400 text-emerald-800';
            else if (isSelectedOption && !isCorrectOption) variant = 'bg-red-50 border-red-400 text-red-800';
            else variant = 'bg-card border-border text-muted-foreground';
          } else {
            variant = isSelectedOption
              ? 'bg-blue-50 border-blue-500 text-blue-800'
              : 'bg-card border-border hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer';
          }

          return (
            <button
              key={key}
              disabled={submitted}
              onClick={() => !submitted && setSelected(key)}
              className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all text-sm',
                variant
              )}
            >
              <span className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border',
                submitted && isCorrectOption ? 'bg-emerald-500 text-white border-emerald-500' :
                submitted && isSelectedOption && !isCorrectOption ? 'bg-red-500 text-white border-red-500' :
                isSelectedOption ? 'bg-blue-500 text-white border-blue-500' :
                'bg-muted text-muted-foreground border-border'
              )}>
                {key}
              </span>
              <span className="flex-1">{text}</span>
              {submitted && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              {submitted && isSelectedOption && !isCorrectOption && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Result banner */}
      {submitted && (
        <div className={cn(
          'p-3 rounded-lg text-center text-sm font-semibold border',
          isCorrect
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        )}>
          {isCorrect
            ? '✓ Correct!'
            : `✗ Incorrect — The correct answer is ${question.correctAnswer}`}
        </div>
      )}

      {/* Explanation — shown after submit */}
      {submitted && question.explanation && (
        <div className={cn(
          'rounded-lg border p-4 space-y-1.5',
          isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-center gap-1.5">
            <Lightbulb className={cn('w-4 h-4', isCorrect ? 'text-emerald-600' : 'text-amber-600')} />
            <p className={cn('text-xs font-semibold uppercase tracking-wide', isCorrect ? 'text-emerald-700' : 'text-amber-700')}>
              {isCorrect ? 'Explanation' : `Why ${question.correctAnswer} is correct`}
            </p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!selected} className="w-full">
          Submit Answer
        </Button>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  const keyMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (submitted) return;
      const mapped = keyMap[e.key];
      if (mapped && options.find(o => o.key === mapped)) {
        setSelected(mapped);
      }
      if ((e.key === 'Enter' || e.key === ' ') && selected) {
        e.preventDefault();
        handleSubmit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
    onAnswer(selected === question.correctAnswer, selected);
  }

  return (
    <div className="space-y-5">
      {/* Question */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">MCQ</span>
          {question.difficulty && (
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md',
              question.difficulty === 'hard' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
              question.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
            )}>
              {question.difficulty}
            </span>
          )}
        </div>
        {/* Medical image (X-ray, ECG, histology etc.) */}
        {question.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border bg-black/5 dark:bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.imageUrl}
              alt="Medical image for this question"
              className="w-full max-h-72 object-contain"
            />
          </div>
        )}
        <p className="text-base font-medium leading-relaxed">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {options.map(({ key, text }) => {
          const isCorrectOption = question.correctAnswer === key;
          const isSelectedOption = selected === key;

          let containerClass = '';
          if (submitted) {
            if (isCorrectOption) containerClass = 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300';
            else if (isSelectedOption && !isCorrectOption) containerClass = 'bg-red-50 border-red-400 text-red-800 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-300';
            else containerClass = 'bg-card border-border text-muted-foreground opacity-60';
          } else {
            containerClass = isSelectedOption
              ? 'bg-primary/5 border-primary text-foreground shadow-sm'
              : 'bg-card border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
          }

          return (
            <button
              key={key}
              disabled={submitted}
              onClick={() => !submitted && setSelected(key)}
              className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 text-sm group',
                containerClass
              )}
            >
              <span className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                submitted && isCorrectOption ? 'bg-emerald-500 text-white' :
                submitted && isSelectedOption && !isCorrectOption ? 'bg-red-500 text-white' :
                isSelectedOption ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}>
                {key}
              </span>
              <span className="flex-1 leading-snug">{text}</span>
              {submitted && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              {submitted && isSelectedOption && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Result banner */}
      {submitted && (
        <div className={cn(
          'flex items-center gap-2 p-3.5 rounded-xl text-sm font-semibold border animate-in fade-in slide-in-from-bottom-2 duration-300',
          isCorrect
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
        )}>
          {isCorrect
            ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Correct!</>
            : <><XCircle className="w-5 h-5 text-red-500" /> Incorrect — The correct answer is <strong>{question.correctAnswer}</strong></>}
        </div>
      )}

      {/* Explanation */}
      {submitted && question.explanation && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Explanation</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full h-11 text-base font-semibold"
        >
          Submit Answer
        </Button>
      )}
    </div>
  );
}

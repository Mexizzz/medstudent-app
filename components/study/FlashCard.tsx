'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/db/schema';

interface FlashCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string) => void;
}

export function FlashCard({ question, onAnswer }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState(false);

  function rate(score: 'got_it' | 'almost' | 'missed') {
    setRated(true);
    onAnswer(score === 'got_it', score);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant="outline">Flashcard</Badge>
        {question.cardType && (
          <Badge variant="secondary" className="capitalize text-xs">{question.cardType}</Badge>
        )}
      </div>

      {/* Card */}
      <div
        className="flashcard-container w-full"
        style={{ height: '220px', cursor: flipped ? 'default' : 'pointer' }}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={cn('flashcard-inner w-full h-full', flipped && 'flipped')}>
          {/* Front */}
          <div className="flashcard-front rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-muted flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">Tap to reveal</p>
            <p className="text-lg font-medium text-foreground leading-relaxed">{question.front}</p>
          </div>
          {/* Back */}
          <div className="flashcard-back rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-muted flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-3">Answer</p>
            <p className="text-base text-foreground leading-relaxed">{question.back}</p>
          </div>
        </div>
      </div>

      {!flipped && (
        <p className="text-center text-sm text-muted-foreground">Click the card to flip it</p>
      )}

      {flipped && !rated && (
        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground font-medium">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => rate('got_it')} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              Got it
            </Button>
            <Button onClick={() => rate('almost')} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
              Almost
            </Button>
            <Button onClick={() => rate('missed')} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              Missed
            </Button>
          </div>
        </div>
      )}

      {rated && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RotateCcw className="w-3.5 h-3.5" />
          Rated — moving to next card
        </div>
      )}
    </div>
  );
}

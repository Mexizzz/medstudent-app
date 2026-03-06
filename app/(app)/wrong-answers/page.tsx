'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, RefreshCw, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { cn, subjectColor } from '@/lib/utils';
import { toast } from 'sonner';

interface WrongItem {
  questionId: string;
  id: string;
  type: string;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
  wrongCount: number;
  // MCQ
  question: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  // Flashcard
  front: string | null;
  back: string | null;
  // Fill blank
  blankText: string | null;
  blankAnswer: string | null;
  // Short answer / clinical
  modelAnswer: string | null;
  caseQuestion: string | null;
  caseAnswer: string | null;
}

function questionLabel(item: WrongItem): string {
  return item.question ?? item.front ?? item.blankText ?? item.caseQuestion ?? '—';
}

function correctAnswerLabel(item: WrongItem): string {
  if (item.type === 'mcq') {
    const map: Record<string, string | null> = {
      A: item.optionA, B: item.optionB, C: item.optionC, D: item.optionD,
    };
    return `${item.correctAnswer}: ${map[item.correctAnswer ?? ''] ?? ''}`;
  }
  if (item.type === 'flashcard') return item.back ?? '—';
  if (item.type === 'fill_blank') return item.blankAnswer ?? '—';
  if (item.type === 'short_answer') return item.modelAnswer ?? '—';
  if (item.type === 'clinical_case') return item.caseAnswer ?? '—';
  return '—';
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ', flashcard: 'Flashcard', fill_blank: 'Fill Blank',
  short_answer: 'Short Answer', clinical_case: 'Clinical Case',
};

export default function WrongAnswersPage() {
  const router = useRouter();
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/wrong-answers');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error('Failed to load wrong answers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleQuiz() {
    if (items.length === 0) return;
    setStarting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: items.map(i => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/study/session/${data.sessionId}`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setStarting(false);
    }
  }

  async function handleRemove(item: WrongItem) {
    try {
      await fetch('/api/wrong-answers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: item.id }),
      });
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Removed from wrong answers');
    } catch {
      toast.error('Failed to remove');
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            Wrong Answers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length === 0
              ? 'No wrong answers yet — keep studying!'
              : `${items.length} question${items.length !== 1 ? 's' : ''} you got wrong`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          {items.length > 0 && (
            <Button onClick={handleQuiz} disabled={starting} className="gap-2">
              {starting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Starting...</>
                : <><RotateCcw className="w-4 h-4" />Quiz on All</>}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <div className="p-5 bg-emerald-50 rounded-full">
            <XCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground">All clear!</p>
          <p className="text-muted-foreground text-sm">Complete some study sessions to see wrong answers here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = expanded.has(item.id);
            return (
              <Card key={item.id} className="border-red-100 hover:border-red-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Wrong count badge */}
                    <div className="shrink-0 mt-0.5 flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                        {item.wrongCount}×
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight text-center">wrong</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[item.type] ?? item.type}</Badge>
                        {item.subject && (
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', subjectColor(item.subject))}>
                            {item.subject}
                          </span>
                        )}
                        {item.topic && <span className="text-xs text-muted-foreground">{item.topic}</span>}
                      </div>

                      {/* Question */}
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {questionLabel(item)}
                      </p>

                      {/* Correct answer (always shown) */}
                      <div className="mt-2 flex items-start gap-1.5">
                        <span className="text-xs font-semibold text-emerald-600 shrink-0 mt-0.5">✓ Correct:</span>
                        <span className="text-xs text-muted-foreground">{correctAnswerLabel(item)}</span>
                      </div>

                      {/* Expandable explanation */}
                      {item.explanation && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="mt-2 text-xs text-blue-600 hover:underline"
                        >
                          {isOpen ? 'Hide explanation ▲' : 'Show explanation ▼'}
                        </button>
                      )}
                      {isOpen && item.explanation && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-foreground leading-relaxed">{item.explanation}</p>
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(item)}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Remove from wrong answers"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

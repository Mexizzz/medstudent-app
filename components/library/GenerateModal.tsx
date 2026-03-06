'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_LABELS } from '@/lib/utils';

interface GenerateModalProps {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { id: 'mcq', label: 'MCQs', defaultCount: 10 },
  { id: 'flashcard', label: 'Flashcards', defaultCount: 20 },
  { id: 'fill_blank', label: 'Fill in Blank', defaultCount: 15 },
  { id: 'short_answer', label: 'Short Answer', defaultCount: 8 },
  { id: 'clinical_case', label: 'Clinical Cases', defaultCount: 5 },
];

export function GenerateModal({ sourceId, sourceTitle, sourceType, onSuccess }: GenerateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  // For each type, whether it's enabled and how many to generate
  const [selections, setSelections] = useState<Record<string, { enabled: boolean; count: number }>>(
    Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, { enabled: t.id === 'mcq', count: t.defaultCount }]))
  );

  const isMcqPdf = sourceType === 'mcq_pdf';

  async function handleGenerate() {
    // For MCQ PDFs, always extract only MCQs (all of them)
    const selected = isMcqPdf
      ? [ACTIVITY_TYPES.find(t => t.id === 'mcq')!]
      : ACTIVITY_TYPES.filter(t => selections[t.id]?.enabled);

    if (selected.length === 0) {
      toast.error('Select at least one activity type');
      return;
    }

    setLoading(true);

    const results = await Promise.allSettled(
      selected.map(async (type) => {
        const endpoint = type.id === 'fill_blank' ? 'fill-blank'
          : type.id === 'short_answer' ? 'short-answer'
          : type.id === 'clinical_case' ? 'clinical-case'
          : type.id;

        const res = await fetch(`/api/generate/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId,
            count: isMcqPdf ? 9999 : selections[type.id].count,
            difficulty,
          }),
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Server error (${res.status}). Try again.`);
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return { label: type.label, generated: data.generated ?? 0 };
      })
    );

    let totalGenerated = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalGenerated += r.value.generated;
      } else {
        toast.error(`Generation failed: ${r.reason}`);
      }
    }

    toast.success(`Generated ${totalGenerated} questions!`);
    setOpen(false);
    onSuccess();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Questions</DialogTitle>
          <p className="text-sm text-slate-500 line-clamp-1">{sourceTitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          {!isMcqPdf && (
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isMcqPdf ? (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              All MCQ questions will be extracted from the PDF in order.
            </div>
          ) : (
          <div className="space-y-3">
            <Label>Activity Types</Label>
            {ACTIVITY_TYPES.map(type => {
              const sel = selections[type.id];
              return (
                <div key={type.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sel.enabled}
                        onCheckedChange={v => setSelections(prev => ({
                          ...prev,
                          [type.id]: { ...prev[type.id], enabled: v }
                        }))}
                      />
                      <span className="text-sm">{type.label}</span>
                    </div>
                    {sel.enabled && (
                      <span className="text-xs text-slate-500">{sel.count}</span>
                    )}
                  </div>
                  {sel.enabled && (
                    <Slider
                      value={[sel.count]}
                      min={3}
                      max={type.id === 'clinical_case' ? 10 : 30}
                      step={1}
                      onValueChange={([v]) => setSelections(prev => ({
                        ...prev,
                        [type.id]: { ...prev[type.id], count: v }
                      }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          )}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              : <><Sparkles className="w-4 h-4 mr-2" />Generate Questions</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

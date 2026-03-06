'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_LABELS } from '@/lib/utils';
import { format } from 'date-fns';

interface Source {
  id: string;
  title: string;
  subject?: string | null;
}

interface DayPlanEditorProps {
  date: string;
  open: boolean;
  onClose: () => void;
  sources: Source[];
  onSuccess: () => void;
}

const ALL_ACTIVITY_TYPES = ['mcq', 'flashcard', 'fill_blank', 'short_answer', 'clinical_case'];

export function DayPlanEditor({ date, open, onClose, sources, onSuccess }: DayPlanEditorProps) {
  const [title, setTitle] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>(['mcq']);
  const [questionCount, setQuestionCount] = useState(20);
  const [loading, setLoading] = useState(false);

  function toggleSource(id: string) {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleActivity(type: string) {
    setActivityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  async function handleCreate() {
    if (!title || selectedSources.length === 0 || activityTypes.length === 0) {
      toast.error('Fill in title, select sources and at least one activity type');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/study-plan/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sourceIds: selectedSources, activityTypes, questionCount }),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      toast.success('Study plan added!');
      setTitle('');
      setSelectedSources([]);
      setActivityTypes(['mcq']);
      setQuestionCount(20);
      onClose();
      onSuccess();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = (() => {
    try { return format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d'); } catch { return date; }
  })();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Study Plan</DialogTitle>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Cardiology Review" />
          </div>

          <div>
            <Label>Content Sources * ({selectedSources.length} selected)</Label>
            <div className="mt-1 max-h-36 overflow-y-auto space-y-1 border rounded-lg p-2 bg-muted">
              {sources.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No content sources. Add some in the Library first.</p>
              ) : sources.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-card cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(s.id)}
                    onChange={() => toggleSource(s.id)}
                    className="rounded"
                  />
                  <span className="truncate">{s.title}</span>
                  {s.subject && <span className="text-xs text-muted-foreground flex-shrink-0">{s.subject}</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Activity Types *</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALL_ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleActivity(type)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activityTypes.includes(type)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-card text-muted-foreground border-border hover:border-blue-300'
                  }`}
                >
                  {ACTIVITY_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label>Questions</Label>
              <span className="text-sm font-semibold text-muted-foreground">{questionCount}</span>
            </div>
            <Slider
              value={[questionCount]}
              min={5}
              max={50}
              step={5}
              onValueChange={([v]) => setQuestionCount(v)}
            />
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

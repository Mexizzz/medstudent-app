'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  sourceId: string;
  isPro: boolean;
}

export function AiSummaryPanel({ sourceId, isPro }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    setSummary('');
    setOpen(true);
    try {
      const res = await fetch(`/api/content/${sourceId}/summarize`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to generate summary');
        setLoading(false);
        return;
      }
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummary(text);
      }
    } catch { setError('Failed to generate summary. Please try again.'); }
    finally { setLoading(false); }
  }

  function toggle() {
    if (summary) { setOpen(v => !v); return; }
    if (!loading) generate();
  }

  // Render markdown-lite: bold, headings, bullets
  function renderSummary(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm mt-3 mb-1 text-foreground">{line.slice(3)}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-base mt-4 mb-1 text-foreground">{line.slice(2)}</h2>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 text-sm">
            <span className="text-primary mt-0.5 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />;
    });
  }

  if (!isPro) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-500/5">
        <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI Study Summary</p>
          <p className="text-xs text-muted-foreground">Upgrade to Pro to generate instant AI summaries of your content</p>
        </div>
        <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 shrink-0" asChild>
          <a href="/pricing">Upgrade</a>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        onClick={toggle}
        disabled={loading}
        className={cn('w-full gap-2 justify-between', summary ? 'border-violet-200 text-violet-700 dark:border-violet-500/30 dark:text-violet-400' : '')}
      >
        <span className="flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating AI Summary…' : summary ? 'AI Study Summary' : 'Generate AI Summary'}
        </span>
        {summary && (open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </Button>

      {error && <p className="text-sm text-red-500 mt-2 px-1">{error}</p>}

      {open && summary && (
        <Card className="mt-2 border-violet-100 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5">
          <CardContent className="p-4 space-y-0.5 max-h-[500px] overflow-y-auto">
            {renderSummary(summary)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

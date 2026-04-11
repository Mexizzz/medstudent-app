'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Youtube, Trash2, Eye, FileQuestion, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn, subjectColor, ACTIVITY_LABELS } from '@/lib/utils';
import { GenerateModal } from './GenerateModal';

interface ContentCardProps {
  source: {
    id: string;
    type: string;
    title: string;
    subject?: string | null;
    topic?: string | null;
    wordCount?: number | null;
    pageCount?: number | null;
    youtubeId?: string | null;
    status?: string | null;
    questionCounts: { type: string; count: number }[];
  };
  onDelete: () => void;
}

function SourceIcon({ type }: { type: string }) {
  if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
  if (type === 'mcq_pdf') return <FileQuestion className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-blue-500" />;
}

function sourceTypeBg(type: string) {
  if (type === 'youtube') return 'bg-red-50 dark:bg-red-500/10';
  if (type === 'mcq_pdf') return 'bg-amber-50 dark:bg-amber-500/10';
  return 'bg-blue-50 dark:bg-blue-500/10';
}

function sourceTypeLabel(type: string) {
  if (type === 'mcq_pdf') return 'MCQ PDF';
  if (type === 'youtube') return 'YouTube';
  return 'PDF';
}

function sourceTypeBadgeColor(type: string) {
  if (type === 'youtube') return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  if (type === 'mcq_pdf') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
}

export function ContentCard({ source, onDelete }: ContentCardProps) {
  const isProcessing = source.status === 'processing';

  async function handleDelete() {
    if (!confirm(`Delete "${source.title}"? This will also delete all generated questions.`)) return;
    try {
      const res = await fetch(`/api/content/${source.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted');
      onDelete();
    } catch {
      toast.error('Failed to delete');
    }
  }

  const totalQuestions = source.questionCounts.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className={cn(
      'group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden',
      isProcessing && 'opacity-75'
    )}>
      {/* Top accent bar */}
      <div className={cn(
        'h-1 w-full',
        source.type === 'youtube' ? 'bg-red-400' : source.type === 'mcq_pdf' ? 'bg-amber-400' : 'bg-blue-400'
      )} />

      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-xl flex-shrink-0', sourceTypeBg(source.type))}>
            {isProcessing
              ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              : <SourceIcon type={source.type} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{source.title}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', sourceTypeBadgeColor(source.type))}>
                {sourceTypeLabel(source.type)}
              </span>
              {source.subject && (
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', subjectColor(source.subject))}>
                  {source.subject}
                </span>
              )}
            </div>
          </div>
          {/* Actions — visible on hover */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/library/${source.id}`}>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {source.pageCount && <span className="flex items-center gap-1">📄 {source.pageCount}p</span>}
          {source.wordCount && <span>{source.wordCount.toLocaleString()} words</span>}
          {isProcessing && <span className="text-amber-500 font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing…</span>}
        </div>

        {/* Question counts */}
        {totalQuestions > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {source.questionCounts.map(qc => (
              <span
                key={qc.type}
                className="text-[10px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full font-medium"
              >
                {ACTIVITY_LABELS[qc.type] ?? qc.type}: {qc.count}
              </span>
            ))}
          </div>
        ) : (
          !isProcessing && (
            <p className="text-xs text-muted-foreground/60 italic">No questions generated yet</p>
          )
        )}

        {!isProcessing && (
          <GenerateModal
            sourceId={source.id}
            sourceTitle={source.title}
            sourceType={source.type}
            pageCount={source.pageCount ?? undefined}
            onSuccess={() => window.location.reload()}
          />
        )}
      </CardContent>
    </Card>
  );
}

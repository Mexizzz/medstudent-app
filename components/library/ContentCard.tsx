'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Youtube, Trash2, Eye } from 'lucide-react';
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

export function ContentCard({ source, onDelete }: ContentCardProps) {
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
  const icon = source.type === 'youtube'
    ? <Youtube className="w-5 h-5 text-red-500" />
    : <FileText className="w-5 h-5 text-blue-500" />;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{source.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {source.subject && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', subjectColor(source.subject))}>
                  {source.subject}
                </span>
              )}
              {source.topic && (
                <span className="text-xs text-muted-foreground">{source.topic}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link href={`/library/${source.id}`}>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {source.wordCount && <span>{source.wordCount.toLocaleString()} words</span>}
          {source.pageCount && <span>{source.pageCount} pages</span>}
          <Badge variant="secondary" className="text-xs">
            {source.type === 'mcq_pdf' ? 'MCQ PDF' : source.type === 'youtube' ? 'YouTube' : 'PDF'}
          </Badge>
        </div>

        {/* Question counts */}
        {totalQuestions > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {source.questionCounts.map(qc => (
              <span key={qc.type} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {ACTIVITY_LABELS[qc.type] ?? qc.type}: {qc.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No questions generated yet</p>
        )}

        <GenerateModal
          sourceId={source.id}
          sourceTitle={source.title}
          sourceType={source.type}
          onSuccess={() => window.location.reload()}
        />
      </CardContent>
    </Card>
  );
}

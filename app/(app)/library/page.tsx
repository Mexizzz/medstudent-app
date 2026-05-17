'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentCard } from '@/components/library/ContentCard';
import { UploadModal } from '@/components/library/UploadModal';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Download, FileText, Youtube, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Source {
  id: string;
  type: string;
  title: string;
  subject?: string | null;
  topic?: string | null;
  wordCount?: number | null;
  pageCount?: number | null;
  youtubeId?: string | null;
  youtubeUrl?: string | null;
  status?: string | null;
  createdAt?: string;
  questionCounts: { type: string; count: number }[];
}

export default function LibraryPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      setSources(data);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Library</h1>
          <p className="text-muted-foreground text-sm mt-1">{sources.length} content source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => window.open('/api/export/anki?type=all', '_blank')}
            >
              <Download className="w-3.5 h-3.5" />
              Export to Anki
            </Button>
          )}
          <UploadModal onSuccess={fetchSources} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-xl">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="py-10 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-br from-violet-500/15 to-indigo-500/15 rounded-2xl mb-4">
                <Sparkles className="w-10 h-10 text-violet-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Add your first study source</h2>
              <p className="text-muted-foreground text-sm">
                Once you've added something, the AI can generate MCQs, flashcards, clinical cases, and more from it.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="inline-flex p-2 bg-violet-500/10 rounded-lg mb-2">
                  <FileText className="w-5 h-5 text-violet-500" />
                </div>
                <p className="font-semibold text-sm text-foreground">PDF lectures</p>
                <p className="text-xs text-muted-foreground mt-0.5">Drop in any slides or notes</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="inline-flex p-2 bg-indigo-500/10 rounded-lg mb-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="font-semibold text-sm text-foreground">Plain text</p>
                <p className="text-xs text-muted-foreground mt-0.5">Paste your written notes</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="inline-flex p-2 bg-red-500/10 rounded-lg mb-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                </div>
                <p className="font-semibold text-sm text-foreground">YouTube videos</p>
                <p className="text-xs text-muted-foreground mt-0.5">Just paste the URL</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <UploadModal onSuccess={fetchSources} />
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" /> Takes ~30 seconds
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map(source => (
            <ContentCard key={source.id} source={source} onDelete={fetchSources} />
          ))}
        </div>
      )}
    </div>
  );
}

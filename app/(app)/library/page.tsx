'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentCard } from '@/components/library/ContentCard';
import { UploadModal } from '@/components/library/UploadModal';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Download } from 'lucide-react';
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
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-5 bg-muted rounded-full">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-muted-foreground">No content yet</p>
            <p className="text-muted-foreground text-sm">Upload a PDF or add a YouTube video to get started</p>
          </div>
          <UploadModal onSuccess={fetchSources} />
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

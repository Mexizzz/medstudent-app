'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Loader2, Brain, Play, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_LABELS, subjectColor, cn } from '@/lib/utils';

interface Source {
  id: string;
  title: string;
  subject?: string | null;
  questionCounts: { type: string; count: number }[];
}

interface TopicOption {
  topic: string;
  subject: string | null;
}

const ALL_TYPES = ['mcq', 'flashcard', 'fill_blank', 'short_answer', 'clinical_case'];

function StudyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSourceIds = searchParams.get('sourceIds')?.split(',').filter(Boolean) ?? [];
  const preTypes    = searchParams.get('types')?.split(',').filter(Boolean) ?? [];
  const preCount    = parseInt(searchParams.get('count') ?? '20');
  const planId      = searchParams.get('planId');

  const [sources, setSources]               = useState<Source[]>([]);
  const [loading, setLoading]               = useState(true);
  const [starting, setStarting]             = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(preSourceIds);
  const [selectedTypes, setSelectedTypes]   = useState<string[]>(preTypes.length ? preTypes : ['mcq']);
  const [count, setCount]                   = useState(preCount);

  // Topic filter state
  const [topics, setTopics]                 = useState<TopicOption[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // empty = all
  const [topicsLoading, setTopicsLoading]   = useState(false);
  const [showTopics, setShowTopics]         = useState(false);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(data => setSources(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Reload topics whenever sources or types change
  const loadTopics = useCallback(async () => {
    if (!selectedSources.length) { setTopics([]); setSelectedTopics([]); return; }
    setTopicsLoading(true);
    try {
      const params = new URLSearchParams({ sourceIds: selectedSources.join(',') });
      if (selectedTypes.length) params.set('types', selectedTypes.join(','));
      const res = await fetch(`/api/questions/topics?${params}`);
      const data = await res.json();
      setTopics(data.topics ?? []);
      setSelectedTopics([]); // reset to "all" when sources/types change
    } catch { /* ignore */ }
    finally { setTopicsLoading(false); }
  }, [selectedSources, selectedTypes]);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  function toggleSource(id: string) {
    setSelectedSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function toggleType(type: string) {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  }

  function toggleTopic(topic: string) {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  }

  async function handleStart() {
    if (selectedSources.length === 0) { toast.error('Select at least one content source'); return; }
    if (selectedTypes.length === 0) { toast.error('Select at least one activity type'); return; }

    setStarting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: selectedSources,
          activityTypes: selectedTypes,
          topics: selectedTopics.length ? selectedTopics : undefined,
          count,
          planId: planId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/study/session/${data.sessionId}`);
    } catch (err) {
      toast.error(String(err));
      setStarting(false);
    }
  }

  // Available type counts for selected sources
  const availableTypeCounts: Record<string, number> = {};
  for (const source of sources.filter(s => selectedSources.includes(s.id))) {
    for (const qc of source.questionCounts) {
      availableTypeCounts[qc.type] = (availableTypeCounts[qc.type] ?? 0) + qc.count;
    }
  }

  const allTopicsSelected = selectedTopics.length === 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Start Studying</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your study session</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No content sources yet.</p>
            <Button asChild variant="outline" size="sm"><a href="/library">Go to Library</a></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Source selection ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content Sources ({selectedSources.length} selected)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sources.map(source => {
                const total = source.questionCounts.reduce((s, c) => s + c.count, 0);
                const selected = selectedSources.includes(source.id);
                return (
                  <label key={source.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selected ? 'bg-blue-50 border-blue-300' : 'hover:bg-muted border-border'
                  )}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSource(source.id)} className="rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.title}</p>
                      <p className="text-xs text-muted-foreground">{total} questions available</p>
                    </div>
                    {source.subject && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', subjectColor(source.subject))}>
                        {source.subject}
                      </span>
                    )}
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* ── Activity types ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map(type => {
                  const available = availableTypeCounts[type] ?? 0;
                  const active = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      disabled={available === 0}
                      className={cn(
                        'text-sm px-4 py-2 rounded-lg border transition-colors flex items-center gap-1.5',
                        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border hover:border-blue-300',
                        available === 0 && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      {ACTIVITY_LABELS[type]}
                      <span className={cn('text-xs', active ? 'text-blue-200' : 'text-muted-foreground')}>
                        ({available})
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedSources.length > 0 && Object.keys(availableTypeCounts).length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  No questions found. Generate questions in the Library first.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Topic / Category filter ── */}
          {selectedSources.length > 0 && (
            <Card>
              <CardHeader className="pb-0 pt-4">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setShowTopics(v => !v)}
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    Filter by Topic
                    {!allTopicsSelected ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                        {selectedTopics.length} selected
                      </span>
                    ) : topics.length > 0 ? (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-normal">
                        All {topics.length} topics
                      </span>
                    ) : null}
                  </CardTitle>
                  {showTopics ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </CardHeader>

              {showTopics && (
                <CardContent className="pt-3 pb-4">
                  {topicsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
                    </div>
                  ) : topics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No topics found. Generate questions first.</p>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-muted-foreground">Select specific topics, or leave all unselected to include everything.</p>
                      <div className="flex flex-wrap gap-2">
                        {/* All button */}
                        <button
                          onClick={() => setSelectedTopics([])}
                          className={cn(
                            'text-sm px-3 py-1.5 rounded-full border transition-colors font-medium',
                            allTopicsSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-card text-muted-foreground border-border hover:border-blue-300'
                          )}
                        >
                          All topics
                        </button>

                        {topics.map(({ topic, subject }) => {
                          const active = selectedTopics.includes(topic);
                          return (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={cn(
                                'text-sm px-3 py-1.5 rounded-full border transition-colors',
                                active
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-card text-muted-foreground border-border hover:border-blue-300'
                              )}
                            >
                              {topic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* ── Question count ── */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium">Number of Questions</span>
                <span className="text-lg font-bold text-blue-600">{count}</span>
              </div>
              <Slider
                value={[count]}
                min={5}
                max={50}
                step={5}
                onValueChange={([v]) => setCount(v)}
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleStart}
            disabled={starting || selectedSources.length === 0 || selectedTypes.length === 0}
            className="w-full gap-2 py-6 text-base"
            size="lg"
          >
            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {starting ? 'Starting session…' : 'Start Session'}
          </Button>
        </>
      )}
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <StudyPageContent />
    </Suspense>
  );
}

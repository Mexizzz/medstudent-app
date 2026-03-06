'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LessonViewer } from '@/components/lessons/LessonViewer';
import { LessonChat } from '@/components/lessons/LessonChat';
import { Lightbulb, Loader2, Trash2, Plus, BookOpen, Sparkles, Menu, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LessonData, LessonSummary } from '@/lib/lessons';

export default function LessonsPage() {
  const [lessonList, setLessonList] = useState<LessonSummary[]>([]);
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/lessons');
      const data = await res.json();
      if (data.lessons) setLessonList(data.lessons);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function generateLesson() {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setActiveLesson(data.lesson);
      setTopic('');
      await fetchList();
      toast.success('Lesson generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate lesson');
    } finally {
      setGenerating(false);
    }
  }

  async function loadLesson(id: string) {
    if (activeLesson?.id === id) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/lessons/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setActiveLesson(data.lesson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteLesson(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      setLessonList(prev => prev.filter(l => l.id !== id));
      if (activeLesson?.id === id) setActiveLesson(null);
      toast.success('Lesson deleted');
    } catch {
      toast.error('Failed to delete lesson');
    }
  }

  function handleSectionUpdate(
    index: number,
    patch: { chatImageUrl?: string; chatSvgCode?: string; explanation?: string }
  ) {
    setActiveLesson(prev => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, i) => {
        if (i !== index) return s;
        return {
          ...s,
          // Use 'in' check so explicit undefined clears the old value
          chatImageUrl: 'chatImageUrl' in patch ? patch.chatImageUrl : s.chatImageUrl,
          chatSvgCode: 'chatSvgCode' in patch ? patch.chatSvgCode : s.chatSvgCode,
          explanation: 'explanation' in patch ? (patch.explanation ?? s.explanation) : s.explanation,
        };
      });
      return { ...prev, sections };
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') generateLesson();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Mobile overlay for sidebar */}
      {showSidebar && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setShowSidebar(false)} />
      )}

      {/* Left sidebar — saved lessons */}
      <aside className={cn(
        'w-52 border-r border-border flex flex-col bg-muted shrink-0',
        'lg:relative lg:translate-x-0',
        'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
        showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">My Lessons</p>
          </div>
          <button onClick={() => setShowSidebar(false)} className="lg:hidden p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {lessonList.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-3 text-center">
              No lessons yet.<br />Generate your first one!
            </p>
          ) : (
            lessonList.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => { loadLesson(lesson.id); setShowSidebar(false); }}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-muted transition-colors group',
                  activeLesson?.id === lesson.id && 'bg-amber-50 border-r-2 border-amber-400'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    activeLesson?.id === lesson.id ? 'text-amber-700' : 'text-foreground'
                  )}>
                    {loadingId === lesson.id
                      ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>
                      : lesson.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{lesson.topic}</p>
                </div>
                <button
                  onClick={e => deleteLesson(lesson.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topic input bar */}
        <div className="shrink-0 border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex gap-2 sm:gap-3 items-center max-w-2xl">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted shrink-0">
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="relative flex-1">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a medical topic…"
                className="pl-9 text-sm"
                disabled={generating}
              />
            </div>
            <Button
              onClick={generateLesson}
              disabled={!topic.trim() || generating}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              size="sm"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> <span className="hidden sm:inline">Generating…</span></>
                : <><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Generate Lesson</span></>}
            </Button>
            {activeLesson && (
              <button
                onClick={() => setShowChat(v => !v)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted shrink-0"
              >
                <MessageSquare className={cn('w-4 h-4', showChat ? 'text-amber-600' : 'text-muted-foreground')} />
              </button>
            )}
          </div>
          {generating && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Creating lesson with whiteboard diagrams… this takes 20–40 seconds
            </p>
          )}
        </div>

        {/* Content + Chat */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Lesson content */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            {activeLesson ? (
              <LessonViewer lesson={activeLesson} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                <div className="p-5 bg-amber-50 rounded-full">
                  <Lightbulb className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No lesson selected</p>
                  <p className="text-sm mt-1 text-muted-foreground">
                    Type a medical topic above and click <strong>Generate Lesson</strong>,<br />
                    or pick a saved lesson from the sidebar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {['Cell Membrane', 'Action Potential', 'Cardiac Cycle', 'Renal Tubule', 'Synapse'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className="text-xs px-3 py-1.5 rounded-full border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Chat panel — desktop: inline, mobile: overlay */}
          {activeLesson && (
            <>
              {showChat && <div className="lg:hidden absolute inset-0 bg-black/50 z-10" onClick={() => setShowChat(false)} />}
              <aside className={cn(
                'w-80 border-l border-border flex flex-col overflow-hidden shrink-0 bg-card',
                'lg:relative lg:translate-x-0',
                'absolute right-0 top-0 bottom-0 z-20 transition-transform duration-200',
                showChat ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
              )}>
                <LessonChat lesson={activeLesson} onSectionUpdate={handleSectionUpdate} />
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

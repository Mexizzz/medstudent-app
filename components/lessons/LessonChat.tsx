'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonData } from '@/lib/lessons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LessonChatProps {
  lesson: LessonData;
  onSectionUpdate: (
    index: number,
    patch: { chatImageUrl?: string; chatSvgCode?: string; explanation?: string }
  ) => void;
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

interface UpdateBlock {
  sectionIndex: number;
  wikiSearch?: string;
  svgCode?: string;
  explanation?: string;
}

function parseUpdates(text: string): { cleanText: string; updates: UpdateBlock[] } {
  const updates: UpdateBlock[] = [];

  // Primary: exact marker format
  const exactRegex = /<<<UPDATE_SECTION>>>([\s\S]*?)<<<END_UPDATE>>>/g;
  let match;
  while ((match = exactRegex.exec(text)) !== null) {
    try { updates.push(JSON.parse(match[1].trim())); } catch { /* skip */ }
  }

  // Fallback: AI outputs <<< + JSON without the full marker (common with smaller models)
  if (updates.length === 0) {
    const looseRegex = /<<<[A-Z_]*>*\s*(\{"sectionIndex"[\s\S]*?\})/g;
    while ((match = looseRegex.exec(text)) !== null) {
      try { updates.push(JSON.parse(match[1].trim())); } catch { /* skip */ }
    }
  }

  // Strip all <<< content from display text
  let cleanText = text.replace(/<<<UPDATE_SECTION>>>[\s\S]*?<<<END_UPDATE>>>/g, '').trim();
  if (updates.length > 0 && cleanText === text.trim()) {
    // Loose pattern: remove everything from <<< onward
    cleanText = text.replace(/<<<[\s\S]*$/, '').trim();
  }

  return { cleanText, updates };
}

export function LessonChat({ lesson, onSectionUpdate }: LessonChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [fetchingDiagram, setFetchingDiagram] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function applyUpdates(updates: UpdateBlock[]) {
    for (const update of updates) {
      if (update.wikiSearch) {
        // Clear stale image immediately so user sees loading state
        onSectionUpdate(update.sectionIndex, { chatImageUrl: undefined, chatSvgCode: undefined });
        setFetchingDiagram(true);
        try {
          const res = await fetch(
            `/api/lessons/fetch-diagram?q=${encodeURIComponent(update.wikiSearch)}`
          );
          const data = await res.json();
          console.log('fetch-diagram result:', update.wikiSearch, data.imageUrl);
          onSectionUpdate(update.sectionIndex, {
            chatImageUrl: data.imageUrl ?? undefined,
            explanation: update.explanation,
          });
        } catch {
          // fetch failed silently
        } finally {
          setFetchingDiagram(false);
        }
      } else if (update.svgCode) {
        onSectionUpdate(update.sectionIndex, {
          chatSvgCode: update.svgCode,
          explanation: update.explanation,
        });
      }
    }
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/lessons/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          currentLesson: {
            title: lesson.title,
            topic: lesson.topic,
            overview: lesson.overview,
            sections: lesson.sections,
            summary: lesson.summary,
          },
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Server error ${res.status}: ${errBody}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        // Hide everything from <<< onward while streaming
        const markerIdx = aiText.indexOf('<<<');
        const preview = markerIdx !== -1 ? aiText.slice(0, markerIdx).trim() : aiText;
        setMessages([...history, { role: 'assistant', content: preview }]);
      }

      const { cleanText, updates } = parseUpdates(aiText);
      setMessages([...history, { role: 'assistant', content: cleanText }]);
      await applyUpdates(updates);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Error: ${msg}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const busy = streaming || fetchingDiagram;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Bot className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Lesson Assistant</p>
            <p className="text-xs text-slate-400">Ask questions or request diagrams</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-8 space-y-2 px-4">
            <Bot className="w-7 h-7 mx-auto text-slate-300" />
            <p className="text-xs font-medium text-slate-400">Ask about the lesson</p>
            <div className="space-y-1">
              {['Show me phagocytosis', 'Show me a nephron diagram', 'What is the clinical significance?'].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-left text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg px-2 py-1 transition-colors"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-violet-100' : 'bg-slate-200'
            )}>
              {msg.role === 'assistant'
                ? <Bot className="w-3.5 h-3.5 text-violet-600" />
                : <User className="w-3.5 h-3.5 text-slate-500" />}
            </div>
            <div className={cn(
              'px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[82%]',
              msg.role === 'assistant'
                ? 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                : 'bg-violet-600 text-white rounded-tr-sm'
            )}>
              {msg.content === '' && streaming ? (
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : msg.role === 'assistant' ? (
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {fetchingDiagram && (
          <div className="flex gap-2 items-center text-xs text-violet-500 px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Fetching diagram from the web…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 px-3 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask or request a diagram… (Enter to send)"
            className="resize-none min-h-[40px] max-h-24 text-xs"
            rows={1}
            disabled={busy}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || busy}
            size="icon"
            className="shrink-0 h-9 w-9 bg-violet-600 hover:bg-violet-700"
          >
            {busy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

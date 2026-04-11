'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, GraduationCap, User, Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'medtutor_chat';

function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-3 mb-1">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    // Unordered lists
    .replace(/^[-•*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Wrap consecutive <li> in <ul>/<ol>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, match => `<ul class="space-y-1 my-2">${match}</ul>`)
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-border my-3" />')
    // Newlines to <br> (but not inside block elements)
    .replace(/\n/g, '<br/>');
}

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasStarted = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const toSave = messages.filter(m => m.content !== '');
    if (toSave.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [messages]);

  const sendMessage = useCallback(async (userContent: string, history: Message[]) => {
    const newMessages: Message[] = userContent
      ? [...history, { role: 'user', content: userContent }]
      : history;

    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setStreaming(true);
    setInput('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Server error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content: aiText }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `⚠️ ${errMsg}\n\nPlease try clicking "New Session".` },
      ]);
    } finally {
      setStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed.length > 0) { setMessages(parsed); return; }
      }
    } catch { /* ignore */ }
    sendMessage('', []);
  }, [sendMessage]);

  function handleSend() {
    if (!input.trim() || streaming) return;
    const clean = messages.filter(m => m.content !== '');
    sendMessage(input.trim(), clean);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    localStorage.removeItem(STORAGE_KEY);
    hasStarted.current = false;
    setMessages([]);
    setTimeout(() => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        sendMessage('', []);
      }
    }, 50);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-card" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Personalized to your weak areas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="hidden sm:inline font-medium">Teaching…</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={streaming}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Starting your tutoring session…</p>
              <p className="text-sm mt-1 text-muted-foreground">Analyzing your performance data</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm',
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-blue-500 to-violet-600'
                : 'bg-gradient-to-br from-primary to-primary/70'
            )}>
              {msg.role === 'assistant'
                ? <GraduationCap className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-white" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              'px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[82%] shadow-sm',
              msg.role === 'assistant'
                ? 'bg-card border border-border text-foreground rounded-tl-sm'
                : 'bg-primary text-primary-foreground rounded-tr-sm'
            )}>
              {msg.content === '' && streaming ? (
                <div className="flex gap-1.5 items-center h-5 px-1">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              ) : msg.role === 'assistant' ? (
                <div
                  className="prose-sm max-w-none [&_strong]:font-semibold [&_em]:italic [&_ul]:my-2 [&_li]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end p-2 rounded-2xl border border-border bg-background shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or answer the tutor… (Enter to send)"
              className="resize-none min-h-[40px] max-h-32 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent p-2"
              rows={1}
              disabled={streaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              size="icon"
              className="shrink-0 h-9 w-9 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Chat saves automatically · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, Loader2, GraduationCap, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'medtutor_chat';

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasStarted = useRef(false); // prevents double-init in StrictMode

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save to localStorage on every message change (skip empty streaming placeholder)
  useEffect(() => {
    const toSave = messages.filter(m => m.content !== '');
    if (toSave.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
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
        console.error('Tutor API error:', res.status, errText);
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
        { role: 'assistant', content: `Error: ${errMsg}\n\nPlease try clicking "New Session".` },
      ]);
    } finally {
      setStreaming(false);
    }
  }, []);

  // On mount: load saved chat OR start a new session — runs exactly once
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          return; // restore saved chat, don't call API
        }
      }
    } catch { /* ignore */ }

    // No saved chat — start fresh
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
    // Trigger a fresh session after clearing
    setTimeout(() => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        sendMessage('', []);
      }
    }, 50);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl hidden sm:block">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800">AI Tutor</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Personalized teaching based on your weak areas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 px-2 sm:px-3 py-1.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Teaching…</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gap-1.5 text-slate-400 hover:text-red-500"
            disabled={streaming}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">New Session</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-400">
            <div className="p-5 bg-blue-50 rounded-full">
              <Sparkles className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-slate-500">Starting your tutoring session…</p>
              <p className="text-sm mt-1">Analyzing your performance data</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 max-w-3xl',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-blue-100' : 'bg-slate-200'
            )}>
              {msg.role === 'assistant'
                ? <GraduationCap className="w-4 h-4 text-blue-600" />
                : <User className="w-4 h-4 text-slate-500" />}
            </div>

            <div className={cn(
              'px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[80%]',
              msg.role === 'assistant'
                ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                : 'bg-blue-600 text-white rounded-tr-sm'
            )}>
              {msg.content === '' && streaming ? (
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : msg.role === 'assistant' ? (
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Answer or ask a question… (Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
            disabled={streaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-2">
          Chat is saved — come back anytime. Click "New Session" to reset.
        </p>
      </div>
    </div>
  );
}

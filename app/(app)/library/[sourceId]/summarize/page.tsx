'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Download, Sparkles, Send, RefreshCw, Loader2,
  FileText, MessageSquare, Check, AlertCircle, Lightbulb, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Msg {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

interface SummaryData {
  source: { id: string; title: string; subject: string | null; topic: string | null; wordCount: number | null };
  summary: { content: string; messages: Msg[]; version: number; updatedAt: number } | null;
}

const SUGGESTIONS = [
  'Add more detail on pathophysiology',
  'Include drug dosages and side effects',
  'Add a table comparing differential diagnoses',
  'More high-yield exam pearls',
  'Expand the clinical presentation section',
];

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`} className="my-3 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span className="text-primary mt-1 shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: inline(b) }} />
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  function inline(t: string) {
    return t
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[12px] font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>');
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBullets(); continue; }
    if (line.startsWith('### ')) {
      flushBullets();
      out.push(<h3 key={key++} className="text-base font-bold text-foreground mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushBullets();
      out.push(
        <h2 key={key++} className="text-lg font-bold text-primary mt-6 mb-2 pb-1 border-b border-primary/20">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flushBullets();
      out.push(<h1 key={key++} className="text-2xl font-black text-foreground mt-2 mb-3">{line.slice(2)}</h1>);
    } else if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushBullets();
      out.push(
        <p key={key++} className="text-sm leading-relaxed text-foreground/90 my-2"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
    }
  }
  flushBullets();
  return out;
}

export default function SummarizePage() {
  const router = useRouter();
  const params = useParams();
  const sourceId = params.sourceId as string;

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState('');
  const [refinement, setRefinement] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const summaryScrollRef = useRef<HTMLDivElement>(null);

  async function loadExisting() {
    setLoading(true);
    try {
      const r = await fetch(`/api/content/${sourceId}/summary`);
      if (!r.ok) {
        if (r.status === 404) {
          router.push('/library');
          return;
        }
        throw new Error(await r.text());
      }
      const d = await r.json();
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadExisting(); }, [sourceId]);

  async function generate(refinementText?: string) {
    setStreaming(true);
    setStreamedText('');
    setError('');
    try {
      const r = await fetch(`/api/content/${sourceId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refinementText ? { refinement: refinementText } : {}),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed to generate');
        setStreaming(false);
        return;
      }
      if (!r.body) { setStreaming(false); return; }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamedText(acc);
      }
      setRefinement('');
      await loadExisting();
    } catch (e: any) {
      setError(e?.message || 'Stream error');
    } finally {
      setStreaming(false);
      setStreamedText('');
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const r = await fetch(`/api/content/${sourceId}/summary/pdf`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed to export PDF');
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const title = (data?.source.title || 'summary').replace(/[^a-z0-9-_ ]+/gi, '').replace(/\s+/g, '-');
      a.download = `${title}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function regenerate() {
    if (!confirm('Regenerate from scratch? This replaces the current summary and wipes refinements.')) return;
    try {
      await fetch(`/api/content/${sourceId}/summary`, { method: 'DELETE' });
      await generate();
    } catch {}
  }

  const displayContent = streaming ? streamedText : (data?.summary?.content || '');
  const hasSummary = Boolean(data?.summary?.content);
  const messages = data?.summary?.messages || [];

  useEffect(() => {
    if (summaryScrollRef.current && streaming) {
      summaryScrollRef.current.scrollTop = summaryScrollRef.current.scrollHeight;
    }
  }, [streamedText, streaming]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/library/${sourceId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Summary · {data?.source.title}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {data?.source.subject}
              {data?.source.wordCount ? ` · ${data.source.wordCount.toLocaleString()} words` : ''}
              {data?.summary ? ` · v${data.summary.version}` : ''}
            </p>
          </div>

          {hasSummary && (
            <>
              <button
                onClick={() => setChatOpen(o => !o)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  chatOpen
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Refine
              </button>
              <button
                onClick={regenerate}
                disabled={streaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted disabled:opacity-40"
                title="Regenerate from scratch"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={downloadPdf}
                disabled={downloading || streaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-500">Error</p>
              <p className="text-red-500/80 text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-500/60 hover:text-red-500 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {!hasSummary && !streaming ? (
          <EmptyState onGenerate={() => generate()} title={data?.source.title || ''} />
        ) : (
          <div className={cn(
            'grid gap-4 items-start',
            chatOpen ? 'lg:grid-cols-[1fr_360px]' : 'grid-cols-1',
          )}>
            {/* Summary panel */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Summary</span>
                  {streaming && (
                    <span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Generating…
                    </span>
                  )}
                </div>
                {data?.summary && !streaming && (
                  <span className="text-[10px] text-muted-foreground">
                    Updated {new Date(data.summary.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div ref={summaryScrollRef} className="flex-1 overflow-y-auto px-6 py-5">
                {displayContent ? (
                  <div className="prose-sm max-w-none">
                    {renderMarkdown(displayContent)}
                    {streaming && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle ml-0.5" />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Starting…
                  </div>
                )}
              </div>
            </div>

            {/* Chat panel */}
            {chatOpen && (
              <div className="lg:sticky lg:top-20 bg-card border border-border rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-140px)]">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">Missing anything?</p>
                    <p className="text-[11px] text-muted-foreground">Tell the AI and it will rewrite the summary.</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {messages.filter(m => m.role === 'user').length === 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">Try asking for</p>
                      <div className="space-y-1.5">
                        {SUGGESTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => setRefinement(s)}
                            disabled={streaming}
                            className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted transition-colors border border-transparent hover:border-border disabled:opacity-40"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-foreground">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.filter(m => m.role === 'user').map((m, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{m.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-border">
                  <textarea
                    value={refinement}
                    onChange={e => setRefinement(e.target.value.slice(0, 500))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && !streaming && refinement.trim()) {
                        e.preventDefault();
                        generate(refinement.trim());
                      }
                    }}
                    placeholder="e.g. Include the murmurs by location"
                    rows={2}
                    disabled={streaming}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{refinement.length}/500</span>
                    <button
                      onClick={() => generate(refinement.trim())}
                      disabled={!refinement.trim() || streaming}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Refine
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onGenerate, title }: { onGenerate: () => void; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Generate AI Summary</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        We'll read <span className="font-semibold text-foreground">{title}</span>, build a structured summary,
        and let you refine it by chat until it's exactly what you need — then download as PDF.
      </p>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg"
        style={{ boxShadow: '0 0 24px hsl(var(--primary) / 0.3)' }}
      >
        <Sparkles className="w-4 h-4" />
        Generate Summary
      </button>
      <div className="grid grid-cols-3 gap-3 mt-10 text-xs text-muted-foreground">
        <div>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
            <FileText className="w-4 h-4" />
          </div>
          Structured
          <p className="text-[10px]">Headings + bullets</p>
        </div>
        <div>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          Chat-refine
          <p className="text-[10px]">Ask for more</p>
        </div>
        <div>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
            <Download className="w-4 h-4" />
          </div>
          PDF export
          <p className="text-[10px]">Print-ready</p>
        </div>
      </div>
    </div>
  );
}

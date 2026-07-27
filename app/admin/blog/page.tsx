'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Copy, Download, Sparkles, FileText } from 'lucide-react';

const KINDS = [
  { value: 'guide', label: 'In-depth guide' },
  { value: 'how-to', label: 'How-to (steps)' },
  { value: 'comparison', label: 'Comparison (vs X)' },
  { value: 'listicle', label: 'List post' },
];

type Draft = { slug: string; filename: string; title: string; description: string; fileContent: string };

export default function AdminBlogPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [topic, setTopic] = useState('');
  const [keyword, setKeyword] = useState('');
  const [kind, setKind] = useState('guide');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('medstudy_admin_pw');
      if (saved) { setPassword(saved); setAuthed(true); }
    } catch { /* ignore */ }
  }, []);

  async function login() {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { toast.error('Wrong password'); return; }
      try { localStorage.setItem('medstudy_admin_pw', password); } catch { /* ignore */ }
      setAuthed(true);
    } catch { toast.error('Login failed'); }
  }

  async function generate() {
    if (!topic.trim()) { toast.error('Enter a topic'); return; }
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch('/api/admin/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, topic, keyword, kind }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Generation failed'); return; }
      setDraft(data);
      toast.success('Draft ready — review, then commit the file.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function downloadMd() {
    if (!draft) return;
    const blob = new Blob([draft.fileContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = draft.filename; a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-sm space-y-3">
          <h1 className="text-white text-lg font-bold text-center">Admin — Blog Generator</h1>
          <Input
            type="password" placeholder="Admin password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <Button onClick={login} className="w-full">Enter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" /> AI Blog Generator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generates a full SEO-structured draft. Review it, save the <code className="text-violet-300">.md</code> file
            into <code className="text-violet-300">content/blog/</code>, commit &amp; push — Railway redeploys and it goes live.
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 space-y-3 border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Topic / title idea</label>
            <Input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How to make flashcards from lecture notes"
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-slate-400 mb-1 block">Target keyword (optional)</label>
              <Input
                value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. flashcards from lecture notes"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Post type</label>
              <select
                value={kind} onChange={e => setKind(e.target.value)}
                className="h-9 bg-slate-950 border border-slate-700 rounded-md px-2 text-sm text-white"
              >
                {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="gap-2 bg-violet-600 hover:bg-violet-700">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing… (~20s)</> : <><Sparkles className="w-4 h-4" /> Generate draft</>}
          </Button>
        </div>

        {draft && (
          <div className="bg-slate-900 rounded-xl p-5 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <FileText className="w-4 h-4 text-violet-400" />
                <code className="text-violet-300">content/blog/{draft.filename}</code>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-slate-600 text-slate-200"
                  onClick={() => { navigator.clipboard.writeText(draft.fileContent).then(() => toast.success('Copied')); }}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={downloadMd}>
                  <Download className="w-3.5 h-3.5" /> Download .md
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">{draft.title}</strong> — {draft.description}
            </p>
            <textarea
              readOnly value={draft.fileContent}
              className="w-full h-96 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}

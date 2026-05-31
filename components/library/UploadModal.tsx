'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Youtube, Loader2, FileText, Info, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeModal } from '@/components/ui/UpgradeModal';

const SUBJECTS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Microbiology',
  'Pharmacology', 'Cardiology', 'Neurology', 'Respiratory', 'Gastroenterology',
  'Nephrology', 'Endocrinology', 'Hematology', 'Infectious', 'Rheumatology',
  'Histology', 'Surgery', 'Other'
];

interface UploadModalProps {
  onSuccess: () => void;
}

export function UploadModal({ onSuccess }: UploadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature?: string; requiredTier?: 'pro' | 'max'; limitReached?: boolean; used?: number; limit?: number }>({ open: false });

  // PDF fields
  const [file, setFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubject, setPdfSubject] = useState('');
  const [pdfTopic, setPdfTopic] = useState('');
  const [pdfType, setPdfType] = useState<'pdf' | 'mcq_pdf'>('pdf');
  const fileRef = useRef<HTMLInputElement>(null);

  // YouTube fields
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytSubject, setYtSubject] = useState('');
  const [ytTopic, setYtTopic] = useState('');
  const [ytManualText, setYtManualText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Plain-text / notes fields
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteTopic, setNoteTopic] = useState('');

  function resetYt() {
    setYtUrl(''); setYtTitle(''); setYtSubject(''); setYtTopic('');
    setYtManualText(''); setShowPasteArea(false);
  }

  function resetNotes() {
    setNoteText(''); setNoteTitle(''); setNoteSubject(''); setNoteTopic('');
  }

  async function handleNotesAdd() {
    if (!noteTitle.trim() || !noteText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/content/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim(),
          text: noteText,
          subject: noteSubject,
          topic: noteTopic,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.upgradeRequired) {
          setOpen(false);
          setUpgradeModal({
            open: true,
            feature: 'Notes Upload',
            requiredTier: data.requiredTier ?? 'pro',
            limitReached: res.status === 429,
            used: data.used,
            limit: data.limit,
          });
          return;
        }
        throw new Error(data?.error ?? `Server error (${res.status})`);
      }

      toast.success(`Added "${noteTitle.trim()}" — ${data.wordCount?.toLocaleString()} words`);
      resetNotes();
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePdfUpload() {
    if (!file || !pdfTitle) return;

    // Client-side size guard — gives the user instant feedback instead of
    // making them wait through a long upload that the server will reject.
    const MAX_BYTES = 30 * 1024 * 1024;
    if (file.size === 0) {
      toast.error('The selected file is empty.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 30MB — try compressing or splitting it.`);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted here. Use the Notes tab to paste plain text.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', pdfTitle);
      formData.append('type', pdfType);
      if (pdfSubject) formData.append('subject', pdfSubject);
      if (pdfTopic) formData.append('topic', pdfTopic);

      const res = await fetch('/api/content/upload', { method: 'POST', body: formData });
      // Server may return an empty body or HTML error page on 5xx/413 — read
      // as text first then try to parse, so we never throw "Unexpected end of JSON".
      const bodyText = await res.text().catch(() => '');
      let data: Record<string, unknown> | null = null;
      try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = null; }

      if (!res.ok) {
        if (data?.upgradeRequired) {
          setOpen(false);
          setUpgradeModal({
            open: true,
            feature: 'PDF Upload',
            requiredTier: (data.requiredTier as 'pro' | 'max') ?? 'pro',
            limitReached: res.status === 429,
            used: data.used as number | undefined,
            limit: data.limit as number | undefined,
          });
          return;
        }
        // Status-specific fallbacks when the server didn't supply a body
        const fallback =
          res.status === 413 ? 'PDF is too large. Max upload size is 30MB.'
          : res.status === 504 || res.status === 408 ? 'Upload timed out. Try a smaller PDF or check your connection.'
          : res.status >= 500 ? 'Server error during upload. Please try again in a moment.'
          : `Upload failed (${res.status}).`;
        throw new Error((data?.error as string) || fallback);
      }

      const wordCount = (data?.wordCount as number | undefined) ?? 0;
      toast.success(`Uploaded "${pdfTitle}" — ${wordCount.toLocaleString()} words`);
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleYoutubeAdd() {
    if (!ytTitle) return;
    if (!ytUrl && !ytManualText.trim()) {
      toast.error('Please provide a YouTube URL or paste the transcript text.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/content/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ytUrl || null,
          title: ytTitle,
          subject: ytSubject,
          topic: ytTopic,
          manualText: ytManualText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) {
          setOpen(false);
          setUpgradeModal({
            open: true,
            feature: 'YouTube Import',
            requiredTier: data.requiredTier ?? 'pro',
            limitReached: res.status === 429,
            used: data.used,
            limit: data.limit,
          });
          return;
        }
        // If auto-fetch failed, prompt user to paste manually
        if (!showPasteArea && !ytManualText) {
          setShowPasteArea(true);
          toast.error('Could not auto-fetch transcript. Paste it manually below (see hint).');
          return;
        }
        throw new Error(data.error);
      }

      toast.success(`Added "${ytTitle}" — ${data.wordCount?.toLocaleString()} words`);
      resetYt();
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { resetYt(); resetNotes(); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Study Content</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pdf">
          <TabsList className="w-full">
            <TabsTrigger value="pdf" className="flex-1 gap-2">
              <FileText className="w-4 h-4" />PDF
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-2">
              <NotebookPen className="w-4 h-4" />Notes
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex-1 gap-2">
              <Youtube className="w-4 h-4" />YouTube
            </TabsTrigger>
          </TabsList>

          {/* ── PDF Tab ── */}
          <TabsContent value="pdf" className="space-y-4 pt-2">
            <div>
              <Label>PDF File *</Label>
              <div
                className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center gap-2 justify-center text-sm text-foreground">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {file.name}
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Click to choose a PDF</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={pdfType} onValueChange={(v) => setPdfType(v as 'pdf' | 'mcq_pdf')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">Study Notes / Lecture</SelectItem>
                  <SelectItem value="mcq_pdf">MCQ Bank PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} className="mt-1" placeholder="e.g. Heart Failure Lecture" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Select value={pdfSubject} onValueChange={setPdfSubject}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={pdfTopic} onChange={e => setPdfTopic(e.target.value)} className="mt-1" placeholder="e.g. CHF" />
              </div>
            </div>

            <Button onClick={handlePdfUpload} disabled={!file || !pdfTitle || loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Upload PDF'}
            </Button>
          </TabsContent>

          {/* ── Notes Tab ── */}
          <TabsContent value="notes" className="space-y-4 pt-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                className="mt-1"
                placeholder="e.g. Cardiology — Heart Failure"
              />
            </div>

            <div>
              <Label>Paste your notes *</Label>
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1 mb-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                Paste lecture notes, revision text, anything you wrote. The AI generates questions from this exact text.
              </p>
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Paste your written notes here..."
                className="min-h-[180px] text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">
                {noteText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                {noteText.trim().split(/\s+/).filter(Boolean).length < 50 && noteText.trim().length > 0 && (
                  <span className="text-amber-500"> · need 50+ for good generation</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Select value={noteSubject} onValueChange={setNoteSubject}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={noteTopic} onChange={e => setNoteTopic(e.target.value)} className="mt-1" placeholder="e.g. CHF" />
              </div>
            </div>

            <Button
              onClick={handleNotesAdd}
              disabled={!noteTitle.trim() || !noteText.trim() || loading}
              className="w-full"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                : <><NotebookPen className="w-4 h-4 mr-2" />Add Notes</>}
            </Button>
          </TabsContent>

          {/* ── YouTube Tab ── */}
          <TabsContent value="youtube" className="space-y-4 pt-2">
            <div>
              <Label>YouTube URL</Label>
              <Input
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                className="mt-1"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="mt-1" placeholder="e.g. Histology — Cell Membrane" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Select value={ytSubject} onValueChange={setYtSubject}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={ytTopic} onChange={e => setYtTopic(e.target.value)} className="mt-1" placeholder="e.g. Cell Membrane" />
              </div>
            </div>

            {/* Manual transcript paste (toggle or auto-shown on error) */}
            {!showPasteArea ? (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => setShowPasteArea(true)}
              >
                <Info className="w-3 h-3" />
                Paste transcript manually instead
              </button>
            ) : (
              <div className="space-y-1">
                <Label>Paste Transcript *</Label>
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  On YouTube: click <strong>…More</strong> → <strong>Show transcript</strong>, select all text and paste it here.
                </p>
                <Textarea
                  value={ytManualText}
                  onChange={e => setYtManualText(e.target.value)}
                  placeholder="Paste the video transcript here..."
                  className="min-h-[120px] text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleYoutubeAdd}
              disabled={!ytTitle || (!ytUrl && !ytManualText.trim()) || loading}
              className="w-full"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching transcript...</>
                : ytManualText.trim() ? 'Add with Pasted Transcript' : 'Add YouTube Video'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false })}
        feature={upgradeModal.feature}
        requiredTier={upgradeModal.requiredTier}
        limitReached={upgradeModal.limitReached}
        used={upgradeModal.used}
        limit={upgradeModal.limit}
      />
    </Dialog>
  );
}

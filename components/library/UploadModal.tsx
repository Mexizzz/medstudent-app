'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Youtube, Loader2, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';

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

  function resetYt() {
    setYtUrl(''); setYtTitle(''); setYtSubject(''); setYtTopic('');
    setYtManualText(''); setShowPasteArea(false);
  }

  async function handlePdfUpload() {
    if (!file || !pdfTitle) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', pdfTitle);
      formData.append('type', pdfType);
      if (pdfSubject) formData.append('subject', pdfSubject);
      if (pdfTopic) formData.append('topic', pdfTopic);

      const res = await fetch('/api/content/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Uploaded "${pdfTitle}" — ${data.wordCount?.toLocaleString()} words`);
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(String(err));
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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetYt(); }}>
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
            <TabsTrigger value="youtube" className="flex-1 gap-2">
              <Youtube className="w-4 h-4" />YouTube
            </TabsTrigger>
          </TabsList>

          {/* ── PDF Tab ── */}
          <TabsContent value="pdf" className="space-y-4 pt-2">
            <div>
              <Label>PDF File *</Label>
              <div
                className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center gap-2 justify-center text-sm text-slate-700">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {file.name}
                  </div>
                ) : (
                  <div className="text-slate-400">
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
                <p className="text-xs text-slate-500 flex items-start gap-1">
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
    </Dialog>
  );
}

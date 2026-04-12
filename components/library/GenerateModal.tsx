'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_LABELS } from '@/lib/utils';
import { UpgradeModal } from '@/components/ui/UpgradeModal';

interface GenerateModalProps {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  pageCount?: number;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { id: 'mcq', label: 'MCQs', defaultCount: 10 },
  { id: 'flashcard', label: 'Flashcards', defaultCount: 20 },
  { id: 'fill_blank', label: 'Fill in Blank', defaultCount: 15 },
  { id: 'short_answer', label: 'Short Answer', defaultCount: 8 },
  { id: 'clinical_case', label: 'Clinical Cases', defaultCount: 5 },
];

export function GenerateModal({ sourceId, sourceTitle, sourceType, pageCount, onSuccess }: GenerateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [focusTopic, setFocusTopic] = useState('');
  const [usePageRange, setUsePageRange] = useState(false);
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(pageCount ?? 1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPdf = sourceType === 'pdf' || sourceType === 'mcq_pdf';

  const [selections, setSelections] = useState<Record<string, { enabled: boolean; count: number }>>(
    Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, { enabled: t.id === 'mcq', count: t.defaultCount }]))
  );
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature?: string; requiredTier?: 'pro' | 'max'; limitReached?: boolean; used?: number; limit?: number }>({ open: false });

  const isMcqPdf = sourceType === 'mcq_pdf';

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Use JPEG, PNG, GIF, or WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleGenerate() {
    // Image-based generation path
    if (imageFile) {
      setLoading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:mime;base64, prefix
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });

        const res = await fetch('/api/generate/mcq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId,
            count: imageCount,
            difficulty,
            imageBase64: base64,
            imageMimeType: imageFile.type,
          }),
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) throw new Error(`Server error (${res.status})`);
        const data = await res.json();
        if (!res.ok) {
          if (data.upgradeRequired) {
            setUpgradeModal({ open: true, feature: 'Image MCQ', requiredTier: data.requiredTier || 'pro', limitReached: res.status === 429, used: data.used, limit: data.limit });
          }
          throw new Error(data.error);
        }
        toast.success(`Generated ${data.generated} image-based MCQs!`);
        setOpen(false);
        onSuccess();
      } catch (e) {
        toast.error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Text-based generation path
    const selected = isMcqPdf
      ? [ACTIVITY_TYPES.find(t => t.id === 'mcq')!]
      : ACTIVITY_TYPES.filter(t => selections[t.id]?.enabled);

    if (selected.length === 0) {
      toast.error('Select at least one activity type');
      return;
    }

    setLoading(true);

    const results = await Promise.allSettled(
      selected.map(async (type) => {
        const endpoint = type.id === 'fill_blank' ? 'fill-blank'
          : type.id === 'short_answer' ? 'short-answer'
          : type.id === 'clinical_case' ? 'clinical-case'
          : type.id;

        const res = await fetch(`/api/generate/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId,
            count: isMcqPdf ? 9999 : selections[type.id].count,
            difficulty,
            ...(focusTopic.trim() && { focusTopic: focusTopic.trim() }),
            ...(usePageRange && isPdf && { pageFrom, pageTo }),
          }),
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Server error (${res.status}). Try again.`);
        }
        const data = await res.json();
        if (!res.ok) {
          if (data.upgradeRequired) {
            setUpgradeModal({
              open: true,
              feature: type.label,
              requiredTier: data.requiredTier || 'pro',
              limitReached: res.status === 429,
              used: data.used,
              limit: data.limit,
            });
          }
          throw new Error(data.error);
        }
        return { label: type.label, generated: data.generated ?? 0 };
      })
    );

    let totalGenerated = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalGenerated += r.value.generated;
      } else {
        toast.error(`Generation failed: ${r.reason}`);
      }
    }

    toast.success(`Generated ${totalGenerated} questions!`);
    setOpen(false);
    onSuccess();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Questions</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1">{sourceTitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image upload section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5" />
                Generate from Image
                <span className="text-xs text-muted-foreground font-normal">(X-ray, ECG, histology…)</span>
              </Label>
            </div>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-contain" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg py-5 text-center text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <ImagePlus className="w-5 h-5 mx-auto mb-1 opacity-50" />
                Click to upload a medical image
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />
            {imageFile && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Number of MCQs</Label>
                  <span className="text-xs text-muted-foreground">{imageCount}</span>
                </div>
                <Slider
                  value={[imageCount]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([v]) => setImageCount(v)}
                />
              </div>
            )}
          </div>

          {!imageFile && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">or generate from text</span>
                </div>
              </div>

              {!isMcqPdf && (
                <div>
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isMcqPdf && (
                <div>
                  <Label>Focus Topic <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={focusTopic}
                    onChange={e => setFocusTopic(e.target.value)}
                    placeholder="e.g. Cell Membrane, Mitochondria…"
                    className="mt-1 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Leave empty to generate from all topics</p>
                </div>
              )}

              {isPdf && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Page Range</Label>
                    <Switch checked={usePageRange} onCheckedChange={v => { setUsePageRange(v); if (v && !pageTo) setPageTo(pageCount ?? 1); }} />
                  </div>
                  {usePageRange && (
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">From</span>
                        <Input
                          type="number"
                          min={1}
                          value={pageFrom}
                          onChange={e => setPageFrom(Math.max(1, Number(e.target.value) || 1))}
                          className="w-20 text-sm text-center mt-1"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground mt-5">—</span>
                      <div>
                        <span className="text-xs text-muted-foreground">To</span>
                        <Input
                          type="number"
                          min={pageFrom}
                          value={pageTo}
                          onChange={e => setPageTo(Math.max(pageFrom, Number(e.target.value) || pageFrom))}
                          className="w-20 text-sm text-center mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isMcqPdf ? (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                  All MCQ questions will be extracted from the PDF in order.
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Activity Types</Label>
                  {ACTIVITY_TYPES.map(type => {
                    const sel = selections[type.id];
                    return (
                      <div key={type.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sel.enabled}
                              onCheckedChange={v => setSelections(prev => ({
                                ...prev,
                                [type.id]: { ...prev[type.id], enabled: v }
                              }))}
                            />
                            <span className="text-sm">{type.label}</span>
                          </div>
                          {sel.enabled && (
                            <span className="text-xs text-muted-foreground">{sel.count}</span>
                          )}
                        </div>
                        {sel.enabled && (
                          <Slider
                            value={[sel.count]}
                            min={3}
                            max={type.id === 'clinical_case' ? 10 : 30}
                            step={1}
                            onValueChange={([v]) => setSelections(prev => ({
                              ...prev,
                              [type.id]: { ...prev[type.id], count: v }
                            }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {imageFile && (
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              : imageFile
                ? <><ImagePlus className="w-4 h-4 mr-2" />Generate Image MCQs</>
                : <><Sparkles className="w-4 h-4 mr-2" />Generate Questions</>
            }
          </Button>
        </div>
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

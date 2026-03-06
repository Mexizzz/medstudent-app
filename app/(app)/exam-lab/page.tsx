'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FlaskConical, Plus, Trash2, Loader2, Upload, FileText,
  ChevronDown, ChevronUp, BookOpen, Sparkles, CheckCircle2, X, Menu,
} from 'lucide-react';
import type { ExamProfile } from '@/db/schema';
import type { ExamStyleAnalysis, GeneratedLabQuestion, QuestionMode } from '@/lib/exam-lab';

const QUESTION_COUNTS = [10, 20, 30, 40, 50, 60, 70, 80] as const;

const QUESTION_MODES: { value: QuestionMode; label: string; desc: string }[] = [
  { value: 'mcq',        label: 'MCQ',        desc: 'Multiple choice, 4 options' },
  { value: 'written',    label: 'Written',    desc: 'Short answer / essay' },
  { value: 'structured', label: 'Structured', desc: 'Numbered sections, exam order' },
  { value: 'table',      label: 'Table',      desc: 'Property table, university style' },
  { value: 'mixed',      label: 'Mixed',      desc: '50/50 MCQ + written' },
];

function difficultyColor(level: string) {
  if (level === 'easy') return 'bg-emerald-100 text-emerald-700';
  if (level === 'hard') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function ProfileCard({
  profile,
  selected,
  onSelect,
  onDelete,
}: {
  profile: ExamProfile;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const style = profile.styleAnalysis ? JSON.parse(profile.styleAnalysis) as ExamStyleAnalysis : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      className={cn(
        'w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-muted transition-colors group cursor-pointer',
        selected && 'bg-indigo-50 border-r-2 border-indigo-500'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold truncate', selected ? 'text-indigo-700' : 'text-foreground')}>
          {profile.name}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {style ? `${style.totalDetected || '?'} Qs · ${style.difficultyLevel}` : 'Analyzing…'}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all shrink-0 mt-0.5"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function StructuredAnswerView({ modelAnswer, keyPoints }: { modelAnswer?: string; keyPoints?: string[] }) {
  if (!modelAnswer) return null;

  // Parse sections: split on double-newline between numbered blocks
  const sections = modelAnswer.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-2">
      {/* Section order badge */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-1">
          <span className="text-[10px] text-muted-foreground mr-1">Answer order:</span>
          {keyPoints.map((kp, i) => (
            <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{kp}</span>
          ))}
        </div>
      )}
      {/* Sections */}
      {sections.map((section, i) => {
        const lines = section.split('\n').filter(Boolean);
        const header = lines[0];
        const bullets = lines.slice(1);
        const isMemory = header?.includes('🧠') || bullets.some(b => b.includes('🧠'));
        return (
          <div key={i} className={cn('rounded-lg p-3', isMemory ? 'bg-amber-50 border border-amber-100' : 'bg-muted')}>
            <p className={cn('text-xs font-bold mb-1.5', isMemory ? 'text-amber-700' : 'text-foreground')}>{header}</p>
            <ul className="space-y-0.5">
              {bullets.map((b, j) => (
                <li key={j} className={cn('text-xs leading-relaxed', isMemory ? 'text-amber-800' : 'text-muted-foreground')}>
                  {b.startsWith('→') ? (
                    <span className="flex gap-1.5"><span className="text-indigo-400 shrink-0">→</span><span>{b.slice(1).trim()}</span></span>
                  ) : b}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TableAnswerView({ modelAnswer, keyPoints }: { modelAnswer?: string; keyPoints?: string[] }) {
  if (!modelAnswer) return null;

  // Parse "Property: answer\nProperty2: answer2" lines
  const rows = modelAnswer.split('\n').filter(Boolean).map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return { property: line.trim(), answer: '' };
    return { property: line.slice(0, colonIdx).trim(), answer: line.slice(colonIdx + 1).trim() };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-2/5 border-r border-border">Property</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Answer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? 'bg-card' : 'bg-muted/50')}>
              <td className="px-3 py-2 font-medium text-foreground border-r border-border align-top">{row.property}</td>
              <td className="px-3 py-2 text-muted-foreground align-top">{row.answer || <span className="text-muted-foreground italic">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionPreviewCard({ q, index, onRemove }: { q: GeneratedLabQuestion; index: number; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const isWritten = q.type === 'short_answer';
  const isTable = q.tableFormat === true;
  const isStructured = !isTable && (q.structured === true || (isWritten && q.keyPoints && q.keyPoints.length > 0 && q.keyPoints[0]?.match(/^\d/)));

  const typeLabel = isTable ? 'Table' : isStructured ? 'Structured' : isWritten ? 'Written' : 'MCQ';
  const typeLabelColor = isTable ? 'text-teal-600' : isStructured ? 'text-indigo-600' : isWritten ? 'text-amber-600' : 'text-blue-500';

  return (
    <Card className="border-border">
      <div className="w-full p-4 flex items-start gap-3">
        <button className="flex-1 min-w-0 text-left flex items-start gap-3" onClick={() => setOpen(o => !o)}>
          <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">Q{index + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug line-clamp-2">{q.question}</p>
            <span className={cn('text-[10px] font-medium mt-0.5 inline-block', typeLabelColor)}>
              {typeLabel}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="p-1 text-muted-foreground hover:text-muted-foreground">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
            title="Remove this question"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          {isTable ? (
            <TableAnswerView modelAnswer={q.modelAnswer} keyPoints={q.keyPoints} />
          ) : isStructured ? (
            <StructuredAnswerView modelAnswer={q.modelAnswer} keyPoints={q.keyPoints} />
          ) : isWritten ? (
            <>
              {q.modelAnswer && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-emerald-700 mb-1">Model Answer</p>
                  <p className="text-sm text-emerald-800 leading-relaxed">{q.modelAnswer}</p>
                </div>
              )}
              {q.keyPoints && q.keyPoints.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-blue-700 mb-1.5">Key Points</p>
                  <ul className="space-y-1">
                    {q.keyPoints.map((pt, i) => (
                      <li key={i} className="flex gap-2 text-xs text-blue-800">
                        <span className="text-blue-400 shrink-0">•</span>{pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {(['A', 'B', 'C', 'D'] as const).map(letter => {
                const text = q[`option${letter}` as keyof GeneratedLabQuestion] as string;
                const correct = q.correctAnswer === letter;
                return (
                  <div key={letter} className={cn('flex gap-2 text-sm rounded-lg px-3 py-2', correct ? 'bg-emerald-50 text-emerald-800' : 'bg-muted text-muted-foreground')}>
                    <span className="font-bold shrink-0">{letter}.</span>
                    <span>{text}</span>
                    {correct && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-emerald-500" />}
                  </div>
                );
              })}
              {q.explanation && (
                <p className="text-xs text-muted-foreground bg-blue-50 rounded-lg p-3 leading-relaxed">{q.explanation}</p>
              )}
            </>
          )}
          <div className="flex gap-2 flex-wrap">
            {q.topic && <Badge className="text-[10px] bg-muted text-muted-foreground">{q.topic}</Badge>}
            <Badge className={cn('text-[10px]', difficultyColor(q.difficulty))}>{q.difficulty}</Badge>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ExamLabPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialFileRef = useRef<HTMLInputElement>(null);

  const [profiles, setProfiles] = useState<ExamProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ExamProfile | null>(null);

  // Add-profile form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newText, setNewText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Material + generation
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialText, setMaterialText] = useState('');
  const [useMaterialText, setUseMaterialText] = useState(false);
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('mcq');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedLabQuestion[]>([]);

  // Mobile sidebar
  const [showSidebar, setShowSidebar] = useState(false);

  // Save
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSourceId, setSavedSourceId] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState('');
  const [totalSavedCount, setTotalSavedCount] = useState(0);

  // Add to existing library source
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [librarySources, setLibrarySources] = useState<{ id: string; title: string; questionCount: number }[]>([]);
  const [loadingLibrarySources, setLoadingLibrarySources] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState('');

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/exam-lab/profiles');
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch { /* silent */ }
  }, []);

  const fetchLibrarySources = useCallback(async () => {
    setLoadingLibrarySources(true);
    try {
      const res = await fetch('/api/content');
      const data = await res.json() as { id: string; title: string; questionCounts: { type: string; count: number }[] }[];
      setLibrarySources(data.map(s => ({
        id: s.id,
        title: s.title,
        questionCount: s.questionCounts.reduce((acc, c) => acc + c.count, 0),
      })));
    } catch { /* silent */ }
    finally { setLoadingLibrarySources(false); }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  async function handleAnalyze() {
    if (!newName.trim()) { toast.error('Enter a profile name'); return; }
    if (!newFile && !newText.trim()) { toast.error('Provide exam questions (file or paste)'); return; }

    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      if (newFile) fd.append('file', newFile);
      else fd.append('text', newText.trim());

      const res = await fetch('/api/exam-lab/analyze', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');

      await fetchProfiles();
      setSelectedProfile({ ...data.profile, styleAnalysis: JSON.stringify(data.profile.styleAnalysis) });
      setShowAddForm(false);
      setNewName(''); setNewFile(null); setNewText(''); setUseTextInput(false);
      toast.success('Exam style analyzed and saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/exam-lab/profiles/${id}`, { method: 'DELETE' });
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (selectedProfile?.id === id) setSelectedProfile(null);
      toast.success('Profile deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleGenerate() {
    if (!selectedProfile) return;
    const hasMaterial = useMaterialText ? materialText.trim().length > 0 : !!materialFile;
    if (!hasMaterial) { toast.error('Add your study material first'); return; }

    setGenerating(true);
    setGeneratedQuestions([]);
    setSavedSourceId(null);
    try {
      const fd = new FormData();
      fd.append('profileId', selectedProfile.id);
      fd.append('count', String(questionCount));
      if (subject.trim()) fd.append('subject', subject.trim());
      fd.append('mode', questionMode);
      if (useMaterialText) fd.append('text', materialText.trim());
      else if (materialFile) fd.append('file', materialFile);

      const res = await fetch('/api/exam-lab/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      setGeneratedQuestions(data.questions ?? []);
      setSaveTitle(`${selectedProfile.name} — ${subject || 'Study Material'}`);
      toast.success(`${data.questions?.length ?? 0} questions generated!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(appendToId?: string, appendTitleOverride?: string, appendInitialCount?: number) {
    if (!generatedQuestions.length) return;
    if (!appendToId && !saveTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exam-lab/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle,
          subject,
          generatedQuestions,
          existingSourceId: appendToId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      const finalTitle = appendToId ? (appendTitleOverride ?? savedTitle) : saveTitle.trim();
      const initialCount = appendToId ? (appendInitialCount ?? totalSavedCount) : 0;
      setSavedSourceId(data.sourceId);
      setSavedTitle(finalTitle);
      setTotalSavedCount(initialCount + data.count);
      setGeneratedQuestions([]);
      setSaveMode('new');
      setSelectedExistingId('');
      toast.success(`${data.count} questions ${appendToId ? 'added to' : 'saved to'} Library!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const selectedStyle = selectedProfile?.styleAnalysis
    ? JSON.parse(selectedProfile.styleAnalysis) as ExamStyleAnalysis
    : null;

  const hasMaterial = useMaterialText ? materialText.trim().length > 0 : !!materialFile;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Backdrop overlay for mobile sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Left sidebar — profiles */}
      <aside className={cn(
        'w-52 border-r border-border flex flex-col bg-muted shrink-0 transition-transform duration-200',
        'fixed inset-y-0 left-0 z-40 lg:relative lg:translate-x-0',
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-4 py-3 sm:py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-semibold text-foreground">Exam Profiles</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add profile form */}
        {showAddForm && (
          <div className="p-3 border-b border-border bg-card space-y-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Profile name (e.g. Anatomy Y2)"
              className="text-xs h-8"
            />

            {!useTextInput ? (
              <div className="space-y-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  {newFile ? newFile.name.slice(0, 22) + (newFile.name.length > 22 ? '…' : '') : 'Upload exam PDF'}
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => setNewFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => setUseTextInput(true)} className="text-[10px] text-indigo-500 hover:underline w-full text-center">
                  or paste text instead
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Paste exam questions here…"
                  className="w-full h-24 text-xs border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
                <button onClick={() => setUseTextInput(false)} className="text-[10px] text-indigo-500 hover:underline w-full text-center">
                  upload file instead
                </button>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
            >
              {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3 h-3" /> Analyze Style</>}
            </Button>
          </div>
        )}

        {/* Profile list */}
        <div className="flex-1 overflow-y-auto py-1">
          {profiles.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-4 py-3 text-center leading-relaxed">
              No profiles yet.<br />Click + to analyze your first exam.
            </p>
          ) : (
            profiles.map(p => (
              <ProfileCard
                key={p.id}
                profile={p}
                selected={selectedProfile?.id === p.id}
                onSelect={() => {
                  setSelectedProfile(p);
                  setGeneratedQuestions([]);
                  setSavedSourceId(null);
                  setSavedTitle('');
                  setTotalSavedCount(0);
                }}
                onDelete={() => handleDelete(p.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Main work area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setShowSidebar(true)}
          className="mb-3 p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {!selectedProfile ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-5 bg-indigo-50 rounded-full">
              <FlaskConical className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Select an Exam Profile</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Upload your university's past exam papers in the sidebar to analyze the question style, then generate new questions from your notes.
              </p>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="gap-2 text-indigo-600 border-indigo-200"
            >
              <Plus className="w-4 h-4" /> Add First Exam Profile
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">

            {/* Profile Info */}
            {selectedStyle && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="w-4 h-4 text-indigo-500" />
                    <h2 className="font-semibold text-foreground text-sm">{selectedProfile.name}</h2>
                    <Badge className={cn('text-[10px] ml-auto', difficultyColor(selectedStyle.difficultyLevel))}>
                      {selectedStyle.difficultyLevel}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStyle.questionTypes.map(t => (
                        <Badge key={t} className="text-[10px] bg-indigo-100 text-indigo-700">{t.replace('_', ' ')}</Badge>
                      ))}
                      {selectedStyle.clinicalIntegration && (
                        <Badge className="text-[10px] bg-rose-100 text-rose-700">clinical vignettes</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedStyle.stemStyle}</p>
                    {selectedStyle.phrasingPatterns?.length > 0 && (
                      <div className="space-y-1">
                        {selectedStyle.phrasingPatterns.slice(0, 2).map((p, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground italic bg-card/60 rounded px-2 py-1">"{p}"</p>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">{selectedStyle.topicsPattern}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Material */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Your Study Material
              </h3>

              {!useMaterialText ? (
                <div className="space-y-2">
                  <button
                    onClick={() => materialFileRef.current?.click()}
                    className="w-full flex items-center gap-3 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl px-4 py-5 hover:bg-muted transition-colors"
                  >
                    <div className="p-2 bg-muted rounded-lg">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      {materialFile ? (
                        <><p className="text-sm font-medium text-foreground truncate max-w-sm">{materialFile.name}</p><p className="text-xs text-muted-foreground">Click to change</p></>
                      ) : (
                        <><p className="text-sm font-medium">Upload your lecture notes / PDF</p><p className="text-xs text-muted-foreground">PDF files supported</p></>
                      )}
                    </div>
                    {materialFile && (
                      <FileText className="w-4 h-4 text-indigo-400 ml-auto" />
                    )}
                  </button>
                  <input ref={materialFileRef} type="file" accept=".pdf" className="hidden" onChange={e => setMaterialFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => setUseMaterialText(true)} className="text-xs text-indigo-500 hover:underline">
                    or paste text instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={materialText}
                    onChange={e => setMaterialText(e.target.value)}
                    placeholder="Paste your lecture notes, textbook content, or study material here…"
                    className="w-full h-40 text-sm border border-border rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUseMaterialText(false)} className="text-xs text-indigo-500 hover:underline">
                      upload file instead
                    </button>
                    <span className="text-xs text-muted-foreground">{materialText.length.toLocaleString()} chars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Configure */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Configure</h3>

              {/* Question type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Question Type</label>
                <div className="flex gap-2">
                  {QUESTION_MODES.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setQuestionMode(m.value)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors text-center',
                        questionMode === m.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {m.label}
                      <span className={cn('block text-[10px] font-normal mt-0.5', questionMode === m.value ? 'text-indigo-200' : 'text-muted-foreground')}>
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-36">
                  <label className="text-xs text-muted-foreground mb-1 block">Subject (optional)</label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Anatomy, Physiology"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Questions</label>
                  <div className="flex gap-1">
                    {QUESTION_COUNTS.map(n => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={cn(
                          'w-10 h-9 rounded-lg text-sm font-medium border transition-colors',
                          questionCount === n
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !hasMaterial}
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating {questionCount} questions…</>
                  : <><Sparkles className="w-4 h-4" /> Generate {questionCount} Questions in University Style</>}
              </Button>
              {generating && (
                <p className="text-xs text-muted-foreground text-center">
                  This takes 15–30 seconds
                </p>
              )}
            </div>

            {/* Saved set status banner — shown when a set exists, even between generations */}
            {savedSourceId && generatedQuestions.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800 truncate">{savedTitle}</p>
                  <p className="text-xs text-emerald-600">{totalSavedCount} questions saved · generate more to add to this set</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => router.push('/library')}>
                    Library
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.push('/study')}>
                    Study
                  </Button>
                </div>
              </div>
            )}

            {/* Results */}
            {generatedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Generated {generatedQuestions.length} Questions
                  </h3>
                  <Badge className="bg-indigo-100 text-indigo-700">{selectedProfile.name} style</Badge>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {generatedQuestions.map((q, i) => (
                    <QuestionPreviewCard
                      key={i}
                      q={q}
                      index={i}
                      onRemove={() => setGeneratedQuestions(prev => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>

                {/* Save bar */}
                {savedSourceId ? (
                  // Append to existing set
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-800">Add to existing set?</p>
                        <p className="text-xs text-indigo-600 truncate mt-0.5">"{savedTitle}" · {totalSavedCount} questions already saved</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(savedSourceId)}
                        disabled={saving}
                        className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add {generatedQuestions.length} to "{savedTitle}"
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSavedSourceId(null)}
                        className="text-muted-foreground border-border shrink-0"
                      >
                        New Set
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Save bar
                  <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
                    {/* Mode toggle */}
                    <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
                      <button
                        onClick={() => setSaveMode('new')}
                        className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          saveMode === 'new' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        New set
                      </button>
                      <button
                        onClick={() => {
                          setSaveMode('existing');
                          if (!librarySources.length) fetchLibrarySources();
                        }}
                        className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          saveMode === 'existing' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        Add to existing
                      </button>
                    </div>

                    {saveMode === 'new' ? (
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Save as</label>
                          <Input
                            value={saveTitle}
                            onChange={e => setSaveTitle(e.target.value)}
                            placeholder="Title for this question set"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          onClick={() => handleSave()}
                          disabled={saving || !saveTitle.trim()}
                          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Save to Library
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground block">Choose a library set to add to</label>
                        {loadingLibrarySources ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading library…
                          </div>
                        ) : librarySources.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No library sets found. Save as a new set instead.</p>
                        ) : (
                          <div className="space-y-1 max-h-44 overflow-y-auto">
                            {librarySources.map(s => (
                              <button
                                key={s.id}
                                onClick={() => setSelectedExistingId(s.id)}
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                                  selectedExistingId === s.id
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                )}
                              >
                                <span className="font-medium">{s.title}</span>
                                <span className="text-muted-foreground ml-2">· {s.questionCount} questions</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            const src = librarySources.find(s => s.id === selectedExistingId);
                            handleSave(selectedExistingId, src?.title, src?.questionCount);
                          }}
                          disabled={saving || !selectedExistingId}
                          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          {selectedExistingId
                            ? `Add ${generatedQuestions.length} to "${librarySources.find(s => s.id === selectedExistingId)?.title ?? '…'}"`
                            : 'Select a set above'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

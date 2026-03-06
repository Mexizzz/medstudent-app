'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Target, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const EXAM_TYPES = [
  'USMLE Step 1', 'USMLE Step 2 CK', 'USMLE Step 3',
  'PLAB 1', 'PLAB 2', 'IFOM', 'MRCP', 'National Board',
];

const ALL_SUBJECTS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology',
  'Microbiology', 'Immunology', 'Behavioral Science', 'Biostatistics',
  'Internal Medicine', 'Surgery', 'Pediatrics', 'Obstetrics', 'Gynecology',
  'Psychiatry', 'Neurology', 'Cardiology', 'Pulmonology', 'Nephrology',
];

export default function GoalsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [examType, setExamType] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [targetSubjects, setTargetSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(({ goal }) => {
        if (goal) {
          setExamType(goal.examType ?? '');
          setTargetDate(goal.targetExamDate ?? '');
          setWeeklyHours(goal.weeklyHoursTarget ?? 10);
          setTargetSubjects(goal.targetSubjects ? JSON.parse(goal.targetSubjects) : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSubject(subject: string) {
    setTargetSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: examType || null,
          targetExamDate: targetDate || null,
          weeklyHoursTarget: weeklyHours,
          targetSubjects: targetSubjects.length ? targetSubjects : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      toast.success('Goals saved!');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save goals');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const daysLeft = targetDate
    ? Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Target className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Goals</h1>
          <p className="text-muted-foreground text-sm">Set your exam target and weekly study commitment</p>
        </div>
      </div>

      {/* Exam countdown */}
      {daysLeft !== null && (
        <div className={`p-4 rounded-2xl text-center ${daysLeft < 30 ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
          <p className={`text-4xl font-bold ${daysLeft < 30 ? 'text-red-600' : 'text-blue-600'}`}>{daysLeft}</p>
          <p className="text-sm text-muted-foreground mt-1">days until {examType || 'exam'}</p>
        </div>
      )}

      {/* Exam type */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Target Exam</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EXAM_TYPES.map(et => (
              <button key={et} onClick={() => setExamType(et === examType ? '' : et)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  examType === et
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-card text-muted-foreground border-border hover:border-blue-300'
                }`}>
                {et}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exam date */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Exam Date</CardTitle></CardHeader>
        <CardContent>
          <Input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* Weekly hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Weekly Study Hours
            <span className="text-2xl font-bold text-blue-600">{weeklyHours}h</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="range" min={1} max={40} step={1}
            value={weeklyHours}
            onChange={e => setWeeklyHours(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1h</span><span>20h</span><span>40h</span>
          </div>
        </CardContent>
      </Card>

      {/* Target subjects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Focus Subjects
            {targetSubjects.length > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                {targetSubjects.length} selected
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Leave all unselected to study everything.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SUBJECTS.map(subj => (
              <button key={subj} onClick={() => toggleSubject(subj)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  targetSubjects.includes(subj)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-card text-muted-foreground border-border hover:border-blue-300'
                }`}>
                {subj}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 py-5" size="lg">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
          : saved ? <><CheckCircle2 className="w-4 h-4" />Saved!</>
          : <><Save className="w-4 h-4" />Save Goals</>}
      </Button>
    </div>
  );
}

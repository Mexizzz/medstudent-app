import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function chunkText(text: string, maxWords = 6000): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export function scoreLabel(aiScore: number): string {
  if (aiScore >= 0.85) return 'Excellent';
  if (aiScore >= 0.65) return 'Good';
  if (aiScore >= 0.40) return 'Partial';
  return 'Insufficient';
}

export const SUBJECT_COLORS: Record<string, string> = {
  Cardiology:     'bg-blue-100 text-blue-700',
  Neurology:      'bg-purple-100 text-purple-700',
  Respiratory:    'bg-cyan-100 text-cyan-700',
  Gastroenterology: 'bg-orange-100 text-orange-700',
  Nephrology:     'bg-teal-100 text-teal-700',
  Endocrinology:  'bg-yellow-100 text-yellow-700',
  Hematology:     'bg-red-100 text-red-700',
  Infectious:     'bg-green-100 text-green-700',
  Rheumatology:   'bg-pink-100 text-pink-700',
  Pharmacology:   'bg-indigo-100 text-indigo-700',
  Anatomy:        'bg-stone-100 text-stone-700',
  Physiology:     'bg-lime-100 text-lime-700',
  Biochemistry:   'bg-violet-100 text-violet-700',
  Pathology:      'bg-rose-100 text-rose-700',
  Microbiology:   'bg-emerald-100 text-emerald-700',
  Surgery:        'bg-sky-100 text-sky-700',
};

export function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-700';
}

export const ACTIVITY_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  flashcard: 'Flashcard',
  fill_blank: 'Fill in Blank',
  short_answer: 'Short Answer',
  clinical_case: 'Clinical Case',
  structured: 'Structured',
  table: 'Table',
};

export const ACTIVITY_COLORS: Record<string, string> = {
  mcq:           'bg-blue-100 text-blue-700',
  flashcard:     'bg-purple-100 text-purple-700',
  fill_blank:    'bg-yellow-100 text-yellow-700',
  short_answer:  'bg-green-100 text-green-700',
  clinical_case: 'bg-orange-100 text-orange-700',
};

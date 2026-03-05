/**
 * SM-2 Spaced Repetition algorithm
 * quality: 5 = perfect, 3 = correct with hesitation, 0 = wrong
 */

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysDiff(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86400000);
}

interface SrCardInput {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

interface SrCardOutput {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string;
}

export function calculateSM2(card: SrCardInput, quality: number): SrCardOutput {
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    // Wrong answer — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Correct answer — advance
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );
  }

  const today = todayStr();
  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate: addDays(today, interval),
    lastReviewDate: today,
  };
}

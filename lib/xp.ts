export interface Rank {
  level: number;
  title: string;
  minXp: number;
  color: string; // tailwind text color
  badge: string; // emoji
}

export const RANKS: Rank[] = [
  { level: 1,  title: 'Pre-Med',        minXp: 0,     color: 'text-slate-500',   badge: '📖' },
  { level: 2,  title: 'MS1',            minXp: 100,   color: 'text-slate-600',   badge: '🩺' },
  { level: 3,  title: 'MS2',            minXp: 300,   color: 'text-blue-500',    badge: '🔬' },
  { level: 4,  title: 'MS3',            minXp: 600,   color: 'text-blue-600',    badge: '🏥' },
  { level: 5,  title: 'MS4',            minXp: 1000,  color: 'text-indigo-500',  badge: '🎓' },
  { level: 6,  title: 'Intern',         minXp: 1500,  color: 'text-indigo-600',  badge: '⚕️' },
  { level: 7,  title: 'PGY-1 Resident', minXp: 2500,  color: 'text-violet-500',  badge: '💊' },
  { level: 8,  title: 'PGY-2 Resident', minXp: 4000,  color: 'text-violet-600',  badge: '🧬' },
  { level: 9,  title: 'PGY-3 Resident', minXp: 6000,  color: 'text-purple-500',  badge: '🔭' },
  { level: 10, title: 'Chief Resident', minXp: 9000,  color: 'text-purple-600',  badge: '👑' },
  { level: 11, title: 'Fellow',         minXp: 13000, color: 'text-rose-500',    badge: '🏆' },
  { level: 12, title: 'Attending',      minXp: 18000, color: 'text-rose-600',    badge: '🩻' },
  { level: 13, title: 'Specialist',     minXp: 25000, color: 'text-amber-500',   badge: '⭐' },
  { level: 14, title: 'Consultant',     minXp: 35000, color: 'text-amber-600',   badge: '🌟' },
  { level: 15, title: 'Professor',      minXp: 50000, color: 'text-emerald-500', badge: '🎯' },
];

export interface XpProgress {
  totalXp: number;
  rank: Rank;
  nextRank: Rank | null;
  xpInLevel: number;   // XP earned within current level
  xpForNext: number;   // XP needed to reach next level (span)
  percent: number;     // 0–100 progress within current level
}

export function getRankFromXp(totalXp: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (totalXp >= rank.minXp) current = rank;
    else break;
  }
  return current;
}

export function getXpProgress(totalXp: number): XpProgress {
  const rank = getRankFromXp(totalXp);
  const nextRank = RANKS.find(r => r.level === rank.level + 1) ?? null;

  const xpInLevel = totalXp - rank.minXp;
  const xpForNext = nextRank ? nextRank.minXp - rank.minXp : 1;
  const percent = nextRank ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 100;

  return { totalXp, rank, nextRank, xpInLevel, xpForNext, percent };
}

// XP awards
export const XP_PER_CORRECT   = 10;
export const XP_PER_WRONG     = 2;
export const XP_SESSION_BONUS = 50;
export const XP_PERFECT_BONUS = 100; // awarded if score === 100%
export const XP_EXAM_BONUS    = 200; // awarded for completing an exam session

export function calcSessionXp(correct: number, total: number, isExam = false): number {
  const wrong = total - correct;
  const perfect = correct === total && total > 0;
  return (
    correct * XP_PER_CORRECT +
    wrong * XP_PER_WRONG +
    XP_SESSION_BONUS +
    (perfect ? XP_PERFECT_BONUS : 0) +
    (isExam ? XP_EXAM_BONUS : 0)
  );
}

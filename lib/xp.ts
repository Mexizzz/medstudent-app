export interface Rank {
  level: number;
  title: string;
  minXp: number;
  color: string; // tailwind text color
  badge: string; // emoji
}

export const RANKS: Rank[] = [
  // Unranked
  { level: 1,  title: 'Unranked',     minXp: 0,       color: 'text-slate-400',   badge: '⬜' },
  // Iron 1–3
  { level: 2,  title: 'Iron 1',       minXp: 100,     color: 'text-stone-400',   badge: '🪨' },
  { level: 3,  title: 'Iron 2',       minXp: 250,     color: 'text-stone-500',   badge: '🪨' },
  { level: 4,  title: 'Iron 3',       minXp: 450,     color: 'text-stone-600',   badge: '🪨' },
  // Bronze 1–3
  { level: 5,  title: 'Bronze 1',     minXp: 700,     color: 'text-amber-700',   badge: '🥉' },
  { level: 6,  title: 'Bronze 2',     minXp: 1000,    color: 'text-amber-700',   badge: '🥉' },
  { level: 7,  title: 'Bronze 3',     minXp: 1400,    color: 'text-amber-800',   badge: '🥉' },
  // Silver 1–3
  { level: 8,  title: 'Silver 1',     minXp: 1900,    color: 'text-slate-400',   badge: '🥈' },
  { level: 9,  title: 'Silver 2',     minXp: 2500,    color: 'text-slate-400',   badge: '🥈' },
  { level: 10, title: 'Silver 3',     minXp: 3200,    color: 'text-slate-500',   badge: '🥈' },
  // Gold 1–3
  { level: 11, title: 'Gold 1',       minXp: 4000,    color: 'text-yellow-500',  badge: '🥇' },
  { level: 12, title: 'Gold 2',       minXp: 5000,    color: 'text-yellow-500',  badge: '🥇' },
  { level: 13, title: 'Gold 3',       minXp: 6200,    color: 'text-yellow-600',  badge: '🥇' },
  // Platinum 1–3
  { level: 14, title: 'Platinum 1',   minXp: 7600,    color: 'text-cyan-400',    badge: '💎' },
  { level: 15, title: 'Platinum 2',   minXp: 9200,    color: 'text-cyan-400',    badge: '💎' },
  { level: 16, title: 'Platinum 3',   minXp: 11000,   color: 'text-cyan-500',    badge: '💎' },
  // Diamond 1–3
  { level: 17, title: 'Diamond 1',    minXp: 13500,   color: 'text-violet-400',  badge: '💠' },
  { level: 18, title: 'Diamond 2',    minXp: 16500,   color: 'text-violet-400',  badge: '💠' },
  { level: 19, title: 'Diamond 3',    minXp: 20000,   color: 'text-violet-500',  badge: '💠' },
  // Immortal 1–3
  { level: 20, title: 'Immortal 1',   minXp: 25000,   color: 'text-rose-400',    badge: '🔥' },
  { level: 21, title: 'Immortal 2',   minXp: 32000,   color: 'text-rose-500',    badge: '🔥' },
  { level: 22, title: 'Immortal 3',   minXp: 42000,   color: 'text-rose-600',    badge: '🔥' },
  // Radiant
  { level: 23, title: 'Radiant',      minXp: 55000,   color: 'text-amber-300',   badge: '✨' },
  // Professor — the ultimate rank, extremely hard to reach
  { level: 24, title: 'Professor',    minXp: 100000,  color: 'text-emerald-400', badge: '🎓' },
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

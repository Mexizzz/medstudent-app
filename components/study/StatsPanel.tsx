'use client';

import { Flame, Zap, Snowflake, Trophy } from 'lucide-react';

interface Stats {
  currentStreak: number;
  longestStreak: number;
  freezeTokens: number;
  totalXp: number;
  todaySeconds: number;
  weekSeconds: number;
  achievements: Array<{ code: string; unlocked_at: number }>;
}

const LABELS: Record<string, string> = {
  FIRST_SESSION: 'First session',
  HOUR_HERO: '1h focus',
  DEEP_FOCUS: '2h focus',
  MARATHON: '4h marathon',
  TEN_HOUR_WEEK: '10h/week',
  WEEK_WARRIOR: '7d streak',
  MONTH_MASTER: '30d streak',
  QUIZ_CHAMP: 'Quiz champ',
  NO_DISTRACTIONS: 'No distractions',
  PERFECT_DAY: 'Goal hit',
};

const ICONS: Record<string, string> = {
  FIRST_SESSION: '🎯',
  HOUR_HERO: '⏰',
  DEEP_FOCUS: '🧠',
  MARATHON: '🏃',
  TEN_HOUR_WEEK: '📚',
  WEEK_WARRIOR: '🔥',
  MONTH_MASTER: '👑',
  QUIZ_CHAMP: '🏆',
  NO_DISTRACTIONS: '🎧',
  PERFECT_DAY: '⭐',
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Loading stats…</p>
      </div>
    );
  }
  const unlocked = new Set(stats.achievements.map(a => a.code));
  const allCodes = Object.keys(LABELS);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-3 border border-amber-500/20">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
            <Flame className="w-3 h-3" /> Streak
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-foreground">{stats.currentStreak}</span>
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          {stats.freezeTokens > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: stats.freezeTokens }).map((_, i) => (
                <Snowflake key={i} className="w-3 h-3 text-sky-500" />
              ))}
              <span className="text-[10px] text-sky-600 dark:text-sky-400 ml-0.5">freeze</span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary font-bold">
            <Zap className="w-3 h-3" /> XP
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-foreground">{stats.totalXp.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {fmt(stats.todaySeconds)} today · {fmt(stats.weekSeconds)} this week
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Achievements</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {stats.achievements.length}/{allCodes.length}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {allCodes.map(code => {
            const got = unlocked.has(code);
            return (
              <div
                key={code}
                title={LABELS[code]}
                className={
                  'aspect-square rounded-lg flex items-center justify-center text-lg border transition-all ' +
                  (got
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/40 shadow-sm'
                    : 'bg-muted/50 border-border grayscale opacity-30')
                }
              >
                {ICONS[code]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

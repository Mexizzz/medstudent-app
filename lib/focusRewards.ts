import { sqlite } from '@/db';

export type AchievementUnlock = { code: string; label: string };

const ACHIEVEMENTS: Record<string, { label: string; predicate: (ctx: Ctx) => boolean }> = {
  FIRST_SESSION: { label: 'First study session', predicate: c => c.lifetimeSessions >= 1 },
  HOUR_HERO: { label: '1 hour in a single session', predicate: c => c.sessionSeconds >= 3600 },
  DEEP_FOCUS: { label: '2 hours in a single session', predicate: c => c.sessionSeconds >= 7200 },
  MARATHON: { label: '4 hour single session', predicate: c => c.sessionSeconds >= 14400 },
  TEN_HOUR_WEEK: { label: '10 hours in one week', predicate: c => c.weekSeconds >= 36000 },
  WEEK_WARRIOR: { label: '7 day streak', predicate: c => c.streak >= 7 },
  MONTH_MASTER: { label: '30 day streak', predicate: c => c.streak >= 30 },
  QUIZ_CHAMP: { label: '10 correct quizzes in one session', predicate: c => c.sessionCorrect >= 10 },
  NO_DISTRACTIONS: { label: '1 hour with no distractions', predicate: c => c.sessionSeconds >= 3600 && c.sessionDistraction === 0 },
  PERFECT_DAY: { label: 'Hit daily goal', predicate: c => c.hitGoal },
};

interface Ctx {
  sessionSeconds: number;
  sessionDistraction: number;
  sessionCorrect: number;
  streak: number;
  weekSeconds: number;
  lifetimeSessions: number;
  hitGoal: boolean;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function finalizeSession(userId: string, sessionId: string): {
  totalSeconds: number;
  distractionSeconds: number;
  xpEarned: number;
  streak: number;
  streakChanged: boolean;
  unlocked: AchievementUnlock[];
  hitGoal: boolean;
} {
  const s = sqlite.prepare(
    'SELECT total_seconds, distraction_seconds, correct_quizzes, total_quizzes, goal_seconds, started_at FROM focus_sessions WHERE id = ? AND user_id = ?'
  ).get(sessionId, userId) as any;

  const sessionSeconds = s?.total_seconds || 0;
  const distractionSeconds = s?.distraction_seconds || 0;
  const sessionCorrect = s?.correct_quizzes || 0;
  const goalSeconds: number | null = s?.goal_seconds || null;
  const hitGoal = !!goalSeconds && sessionSeconds >= goalSeconds;

  const xpFromTime = Math.floor(sessionSeconds / 60);
  const xpFromQuiz = sessionCorrect * 10;
  const xpBonus = hitGoal ? 50 : 0;
  const xpEarned = xpFromTime + xpFromQuiz + xpBonus;

  sqlite.prepare(`
    INSERT INTO focus_stats (user_id, total_xp, total_seconds, current_streak, longest_streak, freeze_tokens)
    VALUES (?, ?, ?, 0, 0, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      total_xp = total_xp + excluded.total_xp,
      total_seconds = total_seconds + excluded.total_seconds
  `).run(userId, xpEarned, sessionSeconds);

  const today = ymd(new Date());
  const stats = sqlite.prepare('SELECT * FROM focus_stats WHERE user_id = ?').get(userId) as any;
  let streak = stats?.current_streak || 0;
  let longestStreak = stats?.longest_streak || 0;
  let freezeTokens = stats?.freeze_tokens ?? 1;
  const lastDate: string | null = stats?.last_study_date || null;
  let streakChanged = false;

  const MIN_DAILY_SECONDS = 600;
  if (sessionSeconds >= MIN_DAILY_SECONDS && lastDate !== today) {
    if (lastDate) {
      const prev = new Date(lastDate + 'T00:00:00Z');
      const cur = new Date(today + 'T00:00:00Z');
      const dayDiff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      if (dayDiff === 1) {
        streak += 1;
      } else if (dayDiff === 2 && freezeTokens > 0) {
        freezeTokens -= 1;
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    if (streak > longestStreak) longestStreak = streak;
    const bonusTokens = streak > 0 && streak % 7 === 0 ? 1 : 0;
    sqlite.prepare(`
      UPDATE focus_stats SET
        current_streak = ?, longest_streak = ?, last_study_date = ?, freeze_tokens = MIN(freeze_tokens + ?, 3)
      WHERE user_id = ?
    `).run(streak, longestStreak, today, bonusTokens, userId);
    sqlite.prepare(`UPDATE focus_stats SET freeze_tokens = ? WHERE user_id = ?`).run(freezeTokens + bonusTokens > 3 ? 3 : freezeTokens + bonusTokens, userId);
    streakChanged = true;
  }

  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekSeconds = (sqlite.prepare(
    'SELECT COALESCE(SUM(total_seconds), 0) as s FROM focus_sessions WHERE user_id = ? AND started_at >= ?'
  ).get(userId, weekStart.getTime()) as any).s;

  const lifetimeSessions = (sqlite.prepare(
    'SELECT COUNT(*) as c FROM focus_sessions WHERE user_id = ? AND ended_at IS NOT NULL'
  ).get(userId) as any).c;

  const ctx: Ctx = {
    sessionSeconds, sessionDistraction: distractionSeconds, sessionCorrect,
    streak, weekSeconds, lifetimeSessions, hitGoal,
  };

  const unlocked: AchievementUnlock[] = [];
  const now = Date.now();
  for (const [code, def] of Object.entries(ACHIEVEMENTS)) {
    if (!def.predicate(ctx)) continue;
    const existing = sqlite.prepare('SELECT id FROM focus_achievements WHERE user_id = ? AND code = ?').get(userId, code);
    if (!existing) {
      sqlite.prepare('INSERT INTO focus_achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)').run(userId, code, now);
      unlocked.push({ code, label: def.label });
    }
  }

  return { totalSeconds: sessionSeconds, distractionSeconds, xpEarned, streak, streakChanged, unlocked, hitGoal };
}

export function focusScore(totalSec: number, correct: number, total: number, distractionSec: number): number {
  const timePts = Math.min(120, totalSec / 60);
  const accuracy = total > 0 ? correct / total : 1;
  const distractionPenalty = 1 - Math.min(0.5, distractionSec / 1800);
  return Math.round(timePts * (0.6 + 0.4 * accuracy) * distractionPenalty);
}

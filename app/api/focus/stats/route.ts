import { NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const stats = sqlite.prepare(
      'SELECT current_streak, longest_streak, freeze_tokens, total_xp, total_seconds FROM focus_stats WHERE user_id = ?'
    ).get(userId) as any;

    const achievements = sqlite.prepare(
      'SELECT code, unlocked_at FROM focus_achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).all(userId);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todaySeconds = (sqlite.prepare(
      'SELECT COALESCE(SUM(total_seconds), 0) as s FROM focus_sessions WHERE user_id = ? AND started_at >= ?'
    ).get(userId, start.getTime()) as any).s;

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekSeconds = (sqlite.prepare(
      'SELECT COALESCE(SUM(total_seconds), 0) as s FROM focus_sessions WHERE user_id = ? AND started_at >= ?'
    ).get(userId, weekStart.getTime()) as any).s;

    return NextResponse.json({
      currentStreak: stats?.current_streak || 0,
      longestStreak: stats?.longest_streak || 0,
      freezeTokens: stats?.freeze_tokens ?? 1,
      totalXp: stats?.total_xp || 0,
      totalSeconds: stats?.total_seconds || 0,
      todaySeconds,
      weekSeconds,
      achievements,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

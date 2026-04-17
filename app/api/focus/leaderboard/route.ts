import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const url = new URL(req.url);
    const period = url.searchParams.get('period') ?? 'today';
    const subject = url.searchParams.get('subject');

    const now = Date.now();
    const activeThreshold = now - 90_000;

    let startMs: number;
    if (period === 'week') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      startMs = d.getTime();
    } else if (period === 'all') {
      startMs = 0;
    } else {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
    }

    const params: any[] = [startMs];
    let subjectFilter = '';
    if (subject && subject !== 'all') {
      subjectFilter = 'AND fs.subject = ?';
      params.push(subject);
    }

    const rows = sqlite.prepare(`
      SELECT
        fs.user_id,
        u.name,
        u.username,
        SUM(fs.total_seconds) AS total_seconds,
        SUM(fs.correct_quizzes) AS correct,
        SUM(fs.total_quizzes) AS total_q,
        SUM(fs.distraction_seconds) AS distraction,
        MAX(fs.last_heartbeat_at) AS last_heartbeat
      FROM focus_sessions fs
      JOIN users u ON u.id = fs.user_id
      WHERE fs.started_at >= ? ${subjectFilter}
      GROUP BY fs.user_id
      ORDER BY total_seconds DESC
      LIMIT 50
    `).all(...params) as Array<{
      user_id: string;
      name: string | null;
      username: string | null;
      total_seconds: number;
      correct: number;
      total_q: number;
      distraction: number;
      last_heartbeat: number | null;
    }>;

    const { focusScore } = await import('@/lib/focusRewards');
    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      isMe: r.user_id === userId,
      displayName: r.name || r.username || 'Anonymous',
      totalSeconds: r.total_seconds,
      correct: r.correct || 0,
      totalQuizzes: r.total_q || 0,
      focusScore: focusScore(r.total_seconds, r.correct || 0, r.total_q || 0, r.distraction || 0),
      isActive: r.last_heartbeat !== null && r.last_heartbeat >= activeThreshold,
    }));

    // Also get the current user's own session info (if active)
    const mySession = sqlite.prepare(`
      SELECT id, total_seconds, last_heartbeat_at
      FROM focus_sessions
      WHERE user_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).get(userId) as { id: string; total_seconds: number; last_heartbeat_at: number | null } | undefined;

    return NextResponse.json({ leaderboard, mySession: mySession ?? null });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

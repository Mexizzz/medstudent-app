import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const period = new URL(req.url).searchParams.get('period') ?? 'today';

    const now = Date.now();
    // "Active" = heartbeat within last 90 seconds
    const activeThreshold = now - 90_000;

    let startMs: number;
    if (period === 'week') {
      // Start of current week (Monday)
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      startMs = d.getTime();
    } else {
      // Start of today
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
    }

    // Sum verified seconds per user for the period, join with users for name
    const rows = sqlite.prepare(`
      SELECT
        fs.user_id,
        u.name,
        u.username,
        SUM(fs.total_seconds) AS total_seconds,
        MAX(fs.last_heartbeat_at) AS last_heartbeat
      FROM focus_sessions fs
      JOIN users u ON u.id = fs.user_id
      WHERE fs.started_at >= ?
      GROUP BY fs.user_id
      ORDER BY total_seconds DESC
      LIMIT 50
    `).all(startMs) as Array<{
      user_id: string;
      name: string | null;
      username: string | null;
      total_seconds: number;
      last_heartbeat: number | null;
    }>;

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      isMe: r.user_id === userId,
      displayName: r.name || r.username || 'Anonymous',
      totalSeconds: r.total_seconds,
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

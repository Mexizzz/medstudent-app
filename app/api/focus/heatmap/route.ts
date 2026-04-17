import { NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const start = new Date();
    start.setDate(start.getDate() - 180);
    start.setHours(0, 0, 0, 0);

    const rows = sqlite.prepare(`
      SELECT strftime('%Y-%m-%d', started_at/1000, 'unixepoch') AS day,
             SUM(total_seconds) AS seconds
      FROM focus_sessions
      WHERE user_id = ? AND started_at >= ?
      GROUP BY day
    `).all(userId, start.getTime()) as Array<{ day: string; seconds: number }>;

    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.day] = r.seconds; });

    const days: Array<{ date: string; seconds: number }> = [];
    for (let i = 0; i < 180; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, seconds: map[key] || 0 });
    }

    return NextResponse.json({ days });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

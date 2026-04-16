import { NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await requireAuth();
    const id = nanoid();
    const now = Date.now();

    // Close any stale open sessions for this user (no heartbeat in last 2 min)
    sqlite.prepare(`
      UPDATE focus_sessions
      SET ended_at = ?, total_seconds = total_seconds
      WHERE user_id = ? AND ended_at IS NULL AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)
    `).run(now, userId, now - 120_000);

    sqlite.prepare(`
      INSERT INTO focus_sessions (id, user_id, started_at, last_heartbeat_at, total_seconds)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, userId, now, now);

    return NextResponse.json({ sessionId: id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

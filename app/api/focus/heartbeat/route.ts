import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL = 30; // seconds the client pings every 30s
const MAX_GAP = 60;            // if gap > 60s we don't credit the time (tab was hidden)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const now = Date.now();
    const session = sqlite.prepare(
      'SELECT id, user_id, last_heartbeat_at, total_seconds, ended_at FROM focus_sessions WHERE id = ?'
    ).get(sessionId) as { id: string; user_id: string; last_heartbeat_at: number | null; total_seconds: number; ended_at: number | null } | undefined;

    if (!session || session.user_id !== userId || session.ended_at) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const last = session.last_heartbeat_at ?? now;
    const gapSecs = (now - last) / 1000;

    // Only credit time if the gap is within a valid window (not asleep/idle)
    const credit = gapSecs <= MAX_GAP ? Math.min(gapSecs, HEARTBEAT_INTERVAL + 5) : 0;
    const newTotal = Math.floor(session.total_seconds + credit);

    sqlite.prepare(
      'UPDATE focus_sessions SET last_heartbeat_at = ?, total_seconds = ? WHERE id = ?'
    ).run(now, newTotal, sessionId);

    return NextResponse.json({ totalSeconds: newTotal });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

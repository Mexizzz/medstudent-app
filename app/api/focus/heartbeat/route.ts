import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL = 30;
const MAX_GAP = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId, hidden, onBreak } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const now = Date.now();
    const session = sqlite.prepare(
      'SELECT id, user_id, last_heartbeat_at, total_seconds, distraction_seconds, ended_at, room_id FROM focus_sessions WHERE id = ?'
    ).get(sessionId) as any;

    if (!session || session.user_id !== userId || session.ended_at) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const last = session.last_heartbeat_at ?? now;
    const gapSecs = (now - last) / 1000;

    let credit = 0;
    let distractionDelta = 0;
    if (onBreak) {
      credit = 0;
    } else if (hidden) {
      credit = 0;
      if (gapSecs <= MAX_GAP) distractionDelta = Math.min(gapSecs, HEARTBEAT_INTERVAL + 5);
    } else {
      credit = gapSecs <= MAX_GAP ? Math.min(gapSecs, HEARTBEAT_INTERVAL + 5) : 0;
    }

    const newTotal = Math.floor(session.total_seconds + credit);
    const newDistraction = Math.floor((session.distraction_seconds || 0) + distractionDelta);

    sqlite.prepare(
      'UPDATE focus_sessions SET last_heartbeat_at = ?, total_seconds = ?, distraction_seconds = ? WHERE id = ?'
    ).run(now, newTotal, newDistraction, sessionId);

    if (session.room_id) {
      sqlite.prepare(
        'UPDATE focus_room_members SET last_seen_at = ? WHERE room_id = ? AND user_id = ?'
      ).run(now, session.room_id, userId);
    }

    return NextResponse.json({ totalSeconds: newTotal, distractionSeconds: newDistraction });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

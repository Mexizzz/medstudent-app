import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { finalizeSession } from '@/lib/focusRewards';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId, notes } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const now = Date.now();
    const session = sqlite.prepare(
      'SELECT id, user_id, total_seconds, room_id, ended_at FROM focus_sessions WHERE id = ?'
    ).get(sessionId) as any;

    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.ended_at) {
      sqlite.prepare(
        'UPDATE focus_sessions SET ended_at = ?, notes = COALESCE(?, notes) WHERE id = ?'
      ).run(now, notes ? String(notes).slice(0, 10000) : null, sessionId);
    }

    if (session.room_id) {
      sqlite.prepare('DELETE FROM focus_room_members WHERE room_id = ? AND user_id = ?').run(session.room_id, userId);
    }

    const result = finalizeSession(userId, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

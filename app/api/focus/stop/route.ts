import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const now = Date.now();
    const session = sqlite.prepare(
      'SELECT id, user_id, total_seconds FROM focus_sessions WHERE id = ?'
    ).get(sessionId) as { id: string; user_id: string; total_seconds: number } | undefined;

    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    sqlite.prepare(
      'UPDATE focus_sessions SET ended_at = ? WHERE id = ?'
    ).run(now, sessionId);

    return NextResponse.json({ totalSeconds: session.total_seconds });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

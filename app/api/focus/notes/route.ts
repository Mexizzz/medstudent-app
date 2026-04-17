import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId, notes } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const s = sqlite.prepare('SELECT user_id FROM focus_sessions WHERE id = ?').get(sessionId) as any;
    if (!s || s.user_id !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    sqlite.prepare('UPDATE focus_sessions SET notes = ? WHERE id = ?').run(
      String(notes ?? '').slice(0, 10000),
      sessionId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

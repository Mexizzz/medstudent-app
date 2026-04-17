import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = sqlite.prepare(`
      SELECT c.id, c.from_user_id, c.to_user_id, c.target_seconds, c.starts_at, c.expires_at, c.status, c.created_at,
        uf.name as from_name, uf.username as from_username,
        ut.name as to_name, ut.username as to_username
      FROM focus_challenges c
      LEFT JOIN users uf ON uf.id = c.from_user_id
      LEFT JOIN users ut ON ut.id = c.to_user_id
      WHERE c.from_user_id = ? OR c.to_user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 40
    `).all(userId, userId) as any[];

    const now = Date.now();
    const enriched = rows.map(c => {
      const targetUserId = c.from_user_id === userId ? c.to_user_id : c.from_user_id;
      const theirSeconds = (sqlite.prepare(
        'SELECT COALESCE(SUM(total_seconds),0) as s FROM focus_sessions WHERE user_id = ? AND started_at >= ? AND started_at < ?'
      ).get(targetUserId, c.starts_at, c.expires_at) as any).s;
      const mySeconds = (sqlite.prepare(
        'SELECT COALESCE(SUM(total_seconds),0) as s FROM focus_sessions WHERE user_id = ? AND started_at >= ? AND started_at < ?'
      ).get(userId, c.starts_at, c.expires_at) as any).s;
      return {
        id: c.id,
        fromUserId: c.from_user_id,
        toUserId: c.to_user_id,
        fromName: c.from_name || c.from_username || 'Anon',
        toName: c.to_name || c.to_username || 'Anon',
        targetSeconds: c.target_seconds,
        startsAt: c.starts_at,
        expiresAt: c.expires_at,
        status: c.status,
        mySeconds,
        theirSeconds,
        isChallenger: c.from_user_id === userId,
        active: now >= c.starts_at && now < c.expires_at && c.status === 'accepted',
      };
    });

    return NextResponse.json({ challenges: enriched });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const toUserId = String(body.toUserId || '');
    const targetMinutes = Math.max(15, Math.min(1440, Number(body.targetMinutes) || 60));
    const durationHours = Math.max(1, Math.min(168, Number(body.durationHours) || 24));

    if (!toUserId || toUserId === userId) return NextResponse.json({ error: 'Invalid target user' }, { status: 400 });

    const now = Date.now();
    const id = nanoid();
    sqlite.prepare(`
      INSERT INTO focus_challenges (id, from_user_id, to_user_id, target_seconds, starts_at, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, userId, toUserId, targetMinutes * 60, now, now + durationHours * 3600_000, now);

    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { id, action } = await req.json();
    if (!id || !['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

    const c = sqlite.prepare('SELECT to_user_id, status FROM focus_challenges WHERE id = ?').get(id) as any;
    if (!c || c.to_user_id !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (c.status !== 'pending') return NextResponse.json({ error: 'Already responded' }, { status: 400 });

    sqlite.prepare('UPDATE focus_challenges SET status = ? WHERE id = ?').run(action === 'accept' ? 'accepted' : 'declined', id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

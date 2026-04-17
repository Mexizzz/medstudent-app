import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const now = Date.now();
    const activeThreshold = now - 120_000;

    const rooms = sqlite.prepare(`
      SELECT r.id, r.code, r.name, r.host_user_id, r.max_members, r.body_double,
        (SELECT COUNT(*) FROM focus_room_members WHERE room_id = r.id AND last_seen_at >= ?) AS active_count,
        (SELECT COUNT(*) FROM focus_room_members WHERE room_id = r.id) AS total_count
      FROM focus_rooms r
      ORDER BY r.created_at DESC
      LIMIT 30
    `).all(activeThreshold) as any[];

    return NextResponse.json({ rooms });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const name = String(body.name || 'Study Room').slice(0, 60);
    const maxMembers = Math.max(2, Math.min(8, Number(body.maxMembers) || 8));
    const bodyDouble = body.bodyDouble ? 1 : 0;

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const exists = sqlite.prepare('SELECT 1 FROM focus_rooms WHERE code = ?').get(code);
      if (!exists) break;
      code = genCode();
    }

    const id = nanoid();
    sqlite.prepare(`
      INSERT INTO focus_rooms (id, code, name, host_user_id, max_members, body_double, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, name, userId, maxMembers, bodyDouble, Date.now());

    return NextResponse.json({ id, code, name, maxMembers, bodyDouble: !!bodyDouble });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireAuth();
    const { code } = await params;
    const room = sqlite.prepare(
      'SELECT id, code, name, host_user_id, max_members, body_double FROM focus_rooms WHERE code = ?'
    ).get(code.toUpperCase()) as any;
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const activeThreshold = Date.now() - 120_000;
    const members = sqlite.prepare(`
      SELECT m.user_id, m.last_seen_at, u.name, u.username,
        (SELECT topic FROM focus_sessions WHERE user_id = m.user_id AND room_id = m.room_id ORDER BY started_at DESC LIMIT 1) AS topic,
        (SELECT total_seconds FROM focus_sessions WHERE user_id = m.user_id AND room_id = m.room_id ORDER BY started_at DESC LIMIT 1) AS total_seconds
      FROM focus_room_members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.room_id = ?
      ORDER BY total_seconds DESC
    `).all(room.id) as any[];

    return NextResponse.json({
      room: { id: room.id, code: room.code, name: room.name, maxMembers: room.max_members, bodyDouble: !!room.body_double },
      members: members.map(m => ({
        userId: m.user_id,
        displayName: m.name || m.username || 'Anon',
        topic: m.topic,
        totalSeconds: m.total_seconds || 0,
        isActive: m.last_seen_at >= activeThreshold,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

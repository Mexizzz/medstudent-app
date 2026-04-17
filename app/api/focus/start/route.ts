import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const topic: string = (body.topic || '').toString().slice(0, 500);
    const subject: string | null = body.subject ? String(body.subject).slice(0, 50) : null;
    const goalMinutes = Number(body.goalMinutes) || 0;
    const pomodoro = body.pomodoro ? 1 : 0;
    const pomodoroWork = Math.max(60, Math.min(7200, Number(body.pomodoroWork) || 1500));
    const pomodoroBreak = Math.max(60, Math.min(3600, Number(body.pomodoroBreak) || 300));
    const roomCode: string | null = body.roomCode ? String(body.roomCode).toUpperCase().slice(0, 12) : null;

    const id = nanoid();
    const now = Date.now();

    // Resolve room
    let roomId: string | null = null;
    if (roomCode) {
      const room = sqlite.prepare(`SELECT id, max_members FROM focus_rooms WHERE code = ?`).get(roomCode) as any;
      if (room) {
        const count = (sqlite.prepare(`SELECT COUNT(*) as c FROM focus_room_members WHERE room_id = ?`).get(room.id) as any).c;
        if (count < room.max_members) {
          sqlite.prepare(`
            INSERT INTO focus_room_members (room_id, user_id, joined_at, last_seen_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(room_id, user_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
          `).run(room.id, userId, now, now);
          roomId = room.id;
        }
      }
    }

    sqlite.prepare(`
      UPDATE focus_sessions SET ended_at = ?
      WHERE user_id = ? AND ended_at IS NULL AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)
    `).run(now, userId, now - 120_000);

    sqlite.prepare(`
      INSERT INTO focus_sessions
        (id, user_id, started_at, last_heartbeat_at, total_seconds, topic, subject, goal_seconds, pomodoro, pomodoro_work, pomodoro_break, room_id)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, now, now, topic || null, subject, goalMinutes > 0 ? goalMinutes * 60 : null, pomodoro, pomodoroWork, pomodoroBreak, roomId);

    return NextResponse.json({ sessionId: id, roomId });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

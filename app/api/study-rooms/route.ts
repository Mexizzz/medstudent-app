import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyRooms, roomMembers, users } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, AuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET — list rooms the user is in
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db
      .select({
        id: studyRooms.id,
        name: studyRooms.name,
        joinCode: studyRooms.joinCode,
        createdBy: studyRooms.createdBy,
        isActive: studyRooms.isActive,
        createdAt: studyRooms.createdAt,
        memberCount: sql<number>`(SELECT count(*) FROM room_members WHERE room_id = ${studyRooms.id} AND is_online = 1)`,
      })
      .from(studyRooms)
      .innerJoin(roomMembers, and(eq(roomMembers.roomId, studyRooms.id), eq(roomMembers.userId, userId)))
      .where(eq(studyRooms.isActive, true))
      .orderBy(desc(studyRooms.createdAt));

    return NextResponse.json({ rooms: rows });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('GET /api/study-rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create a new room
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const userRow = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const userName = userRow[0]?.name || email;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Room name required' }, { status: 400 });

    const now = new Date();
    const roomId = nanoid();
    const joinCode = generateJoinCode();

    await db.insert(studyRooms).values({
      id: roomId,
      name: name.trim(),
      joinCode,
      createdBy: userId,
      isActive: true,
      createdAt: now,
    });

    // Auto-join creator
    await db.insert(roomMembers).values({
      id: nanoid(),
      roomId,
      userId,
      userName: userName || email,
      isOnline: true,
      timerRunning: false,
      totalStudiedSecs: 0,
      lastSeenAt: now,
      joinedAt: now,
    });

    return NextResponse.json({ roomId, joinCode });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /api/study-rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

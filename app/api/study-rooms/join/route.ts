import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyRooms, roomMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

// POST — join room by code
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const userRow = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const userName = userRow[0]?.name || email;
    const { code } = await req.json();
    if (!code?.trim()) return NextResponse.json({ error: 'Join code required' }, { status: 400 });

    const room = await db.query.studyRooms.findFirst({
      where: (r, { eq }) => eq(r.joinCode, code.trim().toUpperCase()),
    });
    if (!room || !room.isActive) return NextResponse.json({ error: 'Room not found or closed' }, { status: 404 });

    // Check if already a member
    const existing = await db.query.roomMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.roomId, room.id), eq(m.userId, userId)),
    });

    const now = new Date();
    if (existing) {
      await db.update(roomMembers)
        .set({ isOnline: true, lastSeenAt: now })
        .where(eq(roomMembers.id, existing.id));
    } else {
      await db.insert(roomMembers).values({
        id: nanoid(),
        roomId: room.id,
        userId,
        userName: userName || email,
        isOnline: true,
        timerRunning: false,
        totalStudiedSecs: 0,
        lastSeenAt: now,
        joinedAt: now,
      });
    }

    return NextResponse.json({ roomId: room.id, roomName: room.name });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

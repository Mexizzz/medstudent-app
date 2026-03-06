import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyRooms, roomMembers, roomMessages } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET — room details + members + recent messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;

    const room = await db.query.studyRooms.findFirst({
      where: (r, { eq }) => eq(r.id, roomId),
    });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // Check membership
    const membership = await db.query.roomMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.userId, userId)),
    });
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    // Update last seen
    await db.update(roomMembers)
      .set({ lastSeenAt: new Date(), isOnline: true })
      .where(eq(roomMembers.id, membership.id));

    const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId));
    const messages = await db.select().from(roomMessages)
      .where(eq(roomMessages.roomId, roomId))
      .orderBy(desc(roomMessages.createdAt))
      .limit(100);

    return NextResponse.json({
      room,
      members,
      messages: messages.reverse(),
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// DELETE — close room (only creator)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;

    const room = await db.query.studyRooms.findFirst({
      where: (r, { eq }) => eq(r.id, roomId),
    });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.createdBy !== userId) return NextResponse.json({ error: 'Only creator can close' }, { status: 403 });

    await db.update(studyRooms).set({ isActive: false }).where(eq(studyRooms.id, roomId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

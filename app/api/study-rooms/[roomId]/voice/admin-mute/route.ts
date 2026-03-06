import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMembers, studyRooms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthError } from '@/lib/auth';

// POST — admin mute/unmute a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const { targetUserId, muted } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    // Verify caller is room creator
    const room = db
      .select({ createdBy: studyRooms.createdBy })
      .from(studyRooms)
      .where(eq(studyRooms.id, roomId))
      .get();

    if (!room || room.createdBy !== userId) {
      return NextResponse.json({ error: 'Only the room creator can mute others' }, { status: 403 });
    }

    await db.update(roomMembers)
      .set({ isMutedByAdmin: !!muted })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, targetUserId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    throw error;
  }
}

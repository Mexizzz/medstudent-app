import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthError } from '@/lib/auth';

// POST — toggle own mic on/off
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const { isMicOn } = await req.json();

    await db.update(roomMembers)
      .set({ isMicOn: !!isMicOn })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    throw error;
  }
}

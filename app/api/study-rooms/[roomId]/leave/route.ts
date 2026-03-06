import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;

    await db.update(roomMembers)
      .set({ isOnline: false, timerRunning: false })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

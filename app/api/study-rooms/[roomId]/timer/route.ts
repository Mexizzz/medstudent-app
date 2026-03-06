import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

// POST — start or stop timer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const { action } = await req.json(); // 'start' | 'stop'

    const member = await db.query.roomMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.userId, userId)),
    });
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const now = new Date();

    if (action === 'start') {
      await db.update(roomMembers)
        .set({ timerRunning: true, timerStartedAt: now, lastSeenAt: now, isOnline: true })
        .where(eq(roomMembers.id, member.id));
    } else if (action === 'stop') {
      // Calculate elapsed seconds since timer started
      let addedSecs = 0;
      if (member.timerRunning && member.timerStartedAt) {
        addedSecs = Math.floor((now.getTime() - new Date(member.timerStartedAt).getTime()) / 1000);
      }
      await db.update(roomMembers)
        .set({
          timerRunning: false,
          timerStartedAt: null,
          totalStudiedSecs: (member.totalStudiedSecs ?? 0) + addedSecs,
          lastSeenAt: now,
          isOnline: true,
        })
        .where(eq(roomMembers.id, member.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

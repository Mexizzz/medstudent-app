import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMembers, roomMessages } from '@/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET — poll for updates (members + new messages since timestamp)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const since = req.nextUrl.searchParams.get('since');

    // Update caller's last seen
    const member = await db.query.roomMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.userId, userId)),
    });
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const now = new Date();
    await db.update(roomMembers)
      .set({ lastSeenAt: now, isOnline: true })
      .where(eq(roomMembers.id, member.id));

    // Mark members as offline if not seen for >15s
    const cutoff = new Date(now.getTime() - 15000);
    await db.update(roomMembers)
      .set({ isOnline: false })
      .where(and(eq(roomMembers.roomId, roomId), lt(roomMembers.lastSeenAt, cutoff)));

    // Get current members
    const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId));

    // Get new messages since timestamp
    let messages: typeof roomMessages.$inferSelect[] = [];
    if (since) {
      const sinceDate = new Date(parseInt(since));
      messages = await db.select().from(roomMessages)
        .where(and(eq(roomMessages.roomId, roomId), gt(roomMessages.createdAt, sinceDate)));
    }

    return NextResponse.json({ members, messages, serverTime: now.getTime() });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

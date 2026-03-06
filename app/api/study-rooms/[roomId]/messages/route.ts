import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomMessages, roomMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId, email } = await requireAuth();
    const userRow = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const userName = userRow[0]?.name || email;
    const { roomId } = await params;
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    // Verify membership
    const member = await db.query.roomMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.userId, userId)),
    });
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const now = new Date();
    const msg = {
      id: nanoid(),
      roomId,
      userId,
      userName: userName || email,
      content: content.trim().slice(0, 500),
      createdAt: now,
    };
    await db.insert(roomMessages).values(msg);

    // Update last seen
    await db.update(roomMembers)
      .set({ lastSeenAt: now, isOnline: true })
      .where(eq(roomMembers.id, member.id));

    return NextResponse.json({ message: msg });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

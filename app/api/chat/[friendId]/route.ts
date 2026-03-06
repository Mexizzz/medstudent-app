import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { directMessages, friendships } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET — messages with a specific friend
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { friendId } = await params;

    // Verify friendship
    const friendship = db
      .select({ id: friendships.id })
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)))
      .get();

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 });
    }

    const messages = await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
          and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(100);

    // Mark unread messages as read
    await db
      .update(directMessages)
      .set({ read: true })
      .where(
        and(
          eq(directMessages.senderId, friendId),
          eq(directMessages.receiverId, userId),
          eq(directMessages.read, false)
        )
      );

    return NextResponse.json(messages.reverse());
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// POST — send message to friend
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { friendId } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Verify friendship
    const friendship = db
      .select({ id: friendships.id })
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)))
      .get();

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 });
    }

    const msg = {
      id: nanoid(),
      senderId: userId,
      receiverId: friendId,
      content: content.trim(),
      read: false,
      createdAt: new Date(),
    };

    await db.insert(directMessages).values(msg);

    return NextResponse.json(msg);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

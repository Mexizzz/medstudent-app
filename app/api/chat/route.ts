import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { directMessages, friendships, users } from '@/db/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET — list conversations (latest message per friend)
export async function GET() {
  try {
    const { userId } = await requireAuth();

    // Get all friends
    const myFriends = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId));

    const friendIds = myFriends.map(f => f.friendId);
    if (friendIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get latest message for each friend conversation
    const conversations = [];
    for (const friendId of friendIds) {
      const lastMsg = await db
        .select()
        .from(directMessages)
        .where(
          or(
            and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
            and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId))
          )
        )
        .orderBy(desc(directMessages.createdAt))
        .limit(1);

      const friend = db
        .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, friendId))
        .get();

      const unreadCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.senderId, friendId),
            eq(directMessages.receiverId, userId),
            eq(directMessages.read, false)
          )
        );

      conversations.push({
        friend,
        lastMessage: lastMsg[0] || null,
        unreadCount: unreadCount[0]?.count ?? 0,
      });
    }

    // Sort by latest message time
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(conversations);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

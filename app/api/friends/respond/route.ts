import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { friendRequests, friendships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// POST — accept or reject a friend request
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { requestId, action } = await req.json();

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const request = db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.toUserId, userId)))
      .get();

    if (!request || request.status !== 'pending') {
      return NextResponse.json({ error: 'Request not found or already handled' }, { status: 404 });
    }

    if (action === 'accept') {
      const now = new Date();
      // Create bidirectional friendship
      await db.insert(friendships).values([
        { id: nanoid(), userId: userId, friendId: request.fromUserId, createdAt: now },
        { id: nanoid(), userId: request.fromUserId, friendId: userId, createdAt: now },
      ]);
      await db.update(friendRequests).set({ status: 'accepted' }).where(eq(friendRequests.id, requestId));
    } else {
      await db.update(friendRequests).set({ status: 'rejected' }).where(eq(friendRequests.id, requestId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

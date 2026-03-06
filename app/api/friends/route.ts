import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { friendRequests, friendships, users } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET — list friends + pending requests
export async function GET() {
  try {
    const { userId } = await requireAuth();

    // Get all friends
    const myFriendships = await db
      .select({
        friendId: friendships.friendId,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .where(eq(friendships.userId, userId));

    const friendIds = myFriendships.map(f => f.friendId);
    let friends: { id: string; name: string | null; username: string | null; bio: string | null; avatarUrl: string | null }[] = [];
    if (friendIds.length > 0) {
      friends = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          bio: users.bio,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Pending requests I received
    const incoming = await db
      .select({
        id: friendRequests.id,
        fromUserId: friendRequests.fromUserId,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .where(and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, 'pending')));

    // Enrich with user info
    const fromIds = incoming.map(r => r.fromUserId);
    let incomingUsers: { id: string; name: string | null; username: string | null }[] = [];
    if (fromIds.length > 0) {
      incomingUsers = await db
        .select({ id: users.id, name: users.name, username: users.username })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(fromIds.map(id => sql`${id}`), sql`, `)})`);
    }

    const incomingEnriched = incoming.map(r => ({
      ...r,
      fromUser: incomingUsers.find(u => u.id === r.fromUserId) || null,
    }));

    // Pending requests I sent
    const outgoing = await db
      .select({
        id: friendRequests.id,
        toUserId: friendRequests.toUserId,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, userId), eq(friendRequests.status, 'pending')));

    return NextResponse.json({ friends, incoming: incomingEnriched, outgoing });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// POST — send friend request (by username)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const target = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.id === userId) {
      return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
    }

    // Check if already friends
    const existing = db
      .select({ id: friendships.id })
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, target.id)))
      .get();
    if (existing) {
      return NextResponse.json({ error: 'Already friends' }, { status: 409 });
    }

    // Check if request already exists (either direction)
    const existingReq = db
      .select({ id: friendRequests.id, status: friendRequests.status })
      .from(friendRequests)
      .where(
        or(
          and(eq(friendRequests.fromUserId, userId), eq(friendRequests.toUserId, target.id)),
          and(eq(friendRequests.fromUserId, target.id), eq(friendRequests.toUserId, userId))
        )
      )
      .get();

    if (existingReq) {
      if (existingReq.status === 'pending') {
        return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
      }
    }

    await db.insert(friendRequests).values({
      id: nanoid(),
      fromUserId: userId,
      toUserId: target.id,
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

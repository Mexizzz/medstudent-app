import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userXp } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const user = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const xpRow = db
      .select({ totalXp: userXp.totalXp })
      .from(userXp)
      .where(eq(userXp.userId, userId))
      .get();

    return NextResponse.json({ ...user, totalXp: xpRow?.totalXp ?? 0 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const { name, username, bio } = body;

    // Validate username if provided
    if (username !== undefined) {
      if (username && (username.length < 3 || username.length > 20)) {
        return NextResponse.json({ error: 'Username must be 3-20 characters' }, { status: 400 });
      }
      if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
      }
      // Check uniqueness
      if (username) {
        const existing = db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .get();
        if (existing && existing.id !== userId) {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }
      }
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name || null;
    if (username !== undefined) updates.username = username || null;
    if (bio !== undefined) updates.bio = bio || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

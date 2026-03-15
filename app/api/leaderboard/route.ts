import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp, users, friendships } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const scope = req.nextUrl.searchParams.get('scope') || 'global';

    let friendIds: string[] = [];
    if (scope === 'friends') {
      const myFriends = await db
        .select({ friendId: friendships.friendId })
        .from(friendships)
        .where(eq(friendships.userId, userId));
      friendIds = [userId, ...myFriends.map(f => f.friendId)];
    }

    const leaderboard = await db
      .select({
        userId: userXp.userId,
        totalXp: userXp.totalXp,
        name: users.name,
        username: users.username,
        subscriptionTier: users.subscriptionTier,
      })
      .from(userXp)
      .innerJoin(users, eq(userXp.userId, users.id))
      .where(
        scope === 'friends' && friendIds.length > 0
          ? sql`${userXp.userId} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`
          : sql`1=1`
      )
      .orderBy(desc(userXp.totalXp))
      .limit(50);

    // Find current user's rank
    const [userRankRow] = await db
      .select({ rank: sql<number>`(SELECT count(*) + 1 FROM user_xp WHERE total_xp > ${userXp.totalXp})` })
      .from(userXp)
      .where(eq(userXp.userId, userId));

    return NextResponse.json({
      leaderboard,
      currentUserId: userId,
      currentUserRank: userRankRow?.rank ?? null,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

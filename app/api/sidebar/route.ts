import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp, users } from '@/db/schema';
import { getStreakInfo } from '@/lib/streak';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const [userRow, streakInfo, xpRows] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.name, subscriptionTier: users.subscriptionTier })
        .from(users).where(eq(users.id, userId)).get(),
      getStreakInfo(userId).catch(() => ({ currentStreak: 0, todayComplete: false })),
      db.select().from(userXp).where(eq(userXp.userId, userId)),
    ]);

    const xp = getXpProgress(xpRows[0]?.totalXp ?? 0);

    return NextResponse.json({
      user: userRow ? { id: userRow.id, email: userRow.email, name: userRow.name, subscriptionTier: userRow.subscriptionTier } : null,
      streak: { currentStreak: streakInfo.currentStreak, todayComplete: streakInfo.todayComplete },
      xp,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ user: null, streak: null, xp: null });
  }
}

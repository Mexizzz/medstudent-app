import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp } from '@/db/schema';
import { getXpProgress } from '@/lib/xp';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { amount } = await req.json() as { amount: number };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const now = new Date();

    // Try update first
    const updated = await db
      .update(userXp)
      .set({ totalXp: sql`${userXp.totalXp} + ${amount}`, updatedAt: now })
      .where(eq(userXp.userId, userId))
      .returning();

    if (updated.length === 0) {
      // First time — insert row for this user
      await db.insert(userXp).values({ id: nanoid(), userId, totalXp: amount, updatedAt: now });
    }

    const rows = await db.select().from(userXp).where(eq(userXp.userId, userId));
    const totalXp = rows[0]?.totalXp ?? amount;
    return NextResponse.json({ xpAdded: amount, ...getXpProgress(totalXp) });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp } from '@/db/schema';
import { getXpProgress } from '@/lib/xp';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json() as { amount: number };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const now = new Date();

    // Try update first
    const updated = await db
      .update(userXp)
      .set({ totalXp: sql`${userXp.totalXp} + ${amount}`, updatedAt: now })
      .where(eq(userXp.id, 1))
      .returning();

    if (updated.length === 0) {
      // First time — insert singleton row
      await db.insert(userXp).values({ id: 1, totalXp: amount, updatedAt: now });
    }

    const rows = await db.select().from(userXp).where(eq(userXp.id, 1));
    const totalXp = rows[0]?.totalXp ?? amount;
    return NextResponse.json({ xpAdded: amount, ...getXpProgress(totalXp) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

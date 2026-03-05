import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp } from '@/db/schema';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db.select().from(userXp).where(eq(userXp.userId, userId));
    const totalXp = rows[0]?.totalXp ?? 0;
    return NextResponse.json(getXpProgress(totalXp));
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json(getXpProgress(0));
  }
}

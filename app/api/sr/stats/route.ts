import { NextResponse } from 'next/server';
import { db } from '@/db';
import { srCards } from '@/db/schema';
import { lte, eq } from 'drizzle-orm';
import { todayStr } from '@/lib/sr';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const today = todayStr();

    const allCards = await db.select().from(srCards).where(eq(srCards.userId, userId));
    const dueCards = allCards.filter(c => c.nextReviewDate <= today);
    const reviewedToday = allCards.filter(c => c.lastReviewDate === today);

    return NextResponse.json({
      dueCount: dueCards.length,
      totalCards: allCards.length,
      reviewedToday: reviewedToday.length,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

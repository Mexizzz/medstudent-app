import { NextResponse } from 'next/server';
import { db } from '@/db';
import { srCards } from '@/db/schema';
import { lte, eq } from 'drizzle-orm';
import { todayStr } from '@/lib/sr';

export async function GET() {
  const today = todayStr();

  const allCards = await db.select().from(srCards);
  const dueCards = allCards.filter(c => c.nextReviewDate <= today);
  const reviewedToday = allCards.filter(c => c.lastReviewDate === today);

  return NextResponse.json({
    dueCount: dueCards.length,
    totalCards: allCards.length,
    reviewedToday: reviewedToday.length,
  });
}

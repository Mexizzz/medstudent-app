import { NextResponse } from 'next/server';
import { db } from '@/db';
import { srCards, questions } from '@/db/schema';
import { lte, eq, and } from 'drizzle-orm';
import { todayStr } from '@/lib/sr';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const today = todayStr();

    // Get all due SR cards joined with question data
    const due = await db
      .select({
        questionId: srCards.questionId,
        nextReviewDate: srCards.nextReviewDate,
        interval: srCards.interval,
        repetitions: srCards.repetitions,
        question: questions,
      })
      .from(srCards)
      .innerJoin(questions, eq(srCards.questionId, questions.id))
      .where(and(eq(srCards.userId, userId), lte(srCards.nextReviewDate, today)))
      .orderBy(srCards.nextReviewDate);

    return NextResponse.json({ due, count: due.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

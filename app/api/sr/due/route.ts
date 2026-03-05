import { NextResponse } from 'next/server';
import { db } from '@/db';
import { srCards, questions } from '@/db/schema';
import { lte, eq } from 'drizzle-orm';
import { todayStr } from '@/lib/sr';

export async function GET() {
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
    .where(lte(srCards.nextReviewDate, today))
    .orderBy(srCards.nextReviewDate);

  return NextResponse.json({ due, count: due.length });
}

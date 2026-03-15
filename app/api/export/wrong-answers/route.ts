import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionResponses, questions } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, hasFeature } from '@/lib/subscription';
import { eq, and, sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const tier = await getUserTier(userId);

    if (!hasFeature(tier, 'pdf_export')) {
      return NextResponse.json({ error: 'PDF Export requires Max', locked: true }, { status: 403 });
    }

    const wrongAnswers = await db
      .select({
        question: questions.question,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        subject: questions.subject,
        topic: questions.topic,
        userAnswer: sessionResponses.userAnswer,
      })
      .from(sessionResponses)
      .innerJoin(questions, eq(sessionResponses.questionId, questions.id))
      .where(and(eq(sessionResponses.userId, userId), sql`${sessionResponses.isCorrect} = 0`))
      .orderBy(questions.subject, questions.topic)
      .limit(200);

    return NextResponse.json({ wrongAnswers });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

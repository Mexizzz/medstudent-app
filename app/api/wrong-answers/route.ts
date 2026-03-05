import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionResponses, questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    // Get all wrong responses joined with question data
    const rows = await db
      .select({
        questionId:   sessionResponses.questionId,
        userAnswer:   sessionResponses.userAnswer,
        answeredAt:   sessionResponses.answeredAt,
        wrongCount:   sql<number>`count(*)`.as('wrong_count'),
        // question fields
        id:               questions.id,
        type:             questions.type,
        subject:          questions.subject,
        topic:            questions.topic,
        difficulty:       questions.difficulty,
        question:         questions.question,
        optionA:          questions.optionA,
        optionB:          questions.optionB,
        optionC:          questions.optionC,
        optionD:          questions.optionD,
        correctAnswer:    questions.correctAnswer,
        front:            questions.front,
        back:             questions.back,
        cardType:         questions.cardType,
        blankText:        questions.blankText,
        blankAnswer:      questions.blankAnswer,
        modelAnswer:      questions.modelAnswer,
        keyPoints:        questions.keyPoints,
        caseScenario:     questions.caseScenario,
        caseQuestion:     questions.caseQuestion,
        caseAnswer:       questions.caseAnswer,
        caseRationale:    questions.caseRationale,
        explanation:      questions.explanation,
      })
      .from(sessionResponses)
      .innerJoin(questions, eq(sessionResponses.questionId, questions.id))
      .where(sql`${sessionResponses.userId} = ${userId} AND ${sessionResponses.isCorrect} = 0`)
      .groupBy(sessionResponses.questionId)
      .orderBy(sql`wrong_count desc`);

    return NextResponse.json({ items: rows, total: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// DELETE a single question from wrong answers (clears its wrong responses)
export async function DELETE(req: Request) {
  try {
    const { userId } = await requireAuth();

    const { questionId } = await req.json();
    if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });

    await db
      .delete(sessionResponses)
      .where(
        sql`${sessionResponses.userId} = ${userId} AND ${sessionResponses.questionId} = ${questionId} AND ${sessionResponses.isCorrect} = 0`
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

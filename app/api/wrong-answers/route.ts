import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionResponses, questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
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
    .where(eq(sessionResponses.isCorrect, false))
    .groupBy(sessionResponses.questionId)
    .orderBy(sql`wrong_count desc`);

  return NextResponse.json({ items: rows, total: rows.length });
}

// DELETE a single question from wrong answers (clears its wrong responses)
export async function DELETE(req: Request) {
  const { questionId } = await req.json();
  if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });

  await db
    .delete(sessionResponses)
    .where(
      sql`${sessionResponses.questionId} = ${questionId} AND ${sessionResponses.isCorrect} = 0`
    );

  return NextResponse.json({ ok: true });
}

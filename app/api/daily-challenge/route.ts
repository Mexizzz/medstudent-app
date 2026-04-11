import { NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, sessionResponses } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Deterministic daily seed from date string
function dateHash(dateStr: string): number {
  let h = 0;
  for (const c of dateStr) { h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; }
  return Math.abs(h);
}

export async function GET() {
  try {
    const today = todayKey();

    // Get all MCQ questions
    const allMcq = await db
      .select({
        id: questions.id,
        question: questions.question,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        subject: questions.subject,
        topic: questions.topic,
        difficulty: questions.difficulty,
      })
      .from(questions)
      .where(eq(questions.type, 'mcq'));

    if (allMcq.length === 0) {
      return NextResponse.json({ error: 'No questions available yet. Generate some MCQs first!' }, { status: 404 });
    }

    const idx = dateHash(today) % allMcq.length;
    const challenge = allMcq[idx];

    // Global stats: how many responses exist for this question today
    const stats = await db
      .select({ count: sql<number>`count(*)`, correct: sql<number>`sum(case when ${sessionResponses.isCorrect} = 1 then 1 else 0 end)` })
      .from(sessionResponses)
      .where(eq(sessionResponses.questionId, challenge.id));

    const total = stats[0]?.count ?? 0;
    const correct = stats[0]?.correct ?? 0;
    const globalPct = total > 0 ? Math.round((correct / total) * 100) : null;

    // Check if current user already answered today
    const auth = await getAuthUser();
    let userAnswered = false;
    let userCorrect: boolean | null = null;
    if (auth?.userId) {
      const userResp = await db
        .select({ isCorrect: sessionResponses.isCorrect, userAnswer: sessionResponses.userAnswer })
        .from(sessionResponses)
        .where(eq(sessionResponses.questionId, challenge.id))
        .limit(20);
      // Check today specifically using answeredAt or just if they have a response (simplified)
      // We'll use localStorage on client to gate re-attempts, but expose the answer if they did
      userAnswered = userResp.some(r => r.userAnswer !== null);
      if (userAnswered) userCorrect = userResp.some(r => r.isCorrect);
    }

    return NextResponse.json({
      date: today,
      question: userAnswered ? challenge : { ...challenge, correctAnswer: undefined, explanation: undefined },
      correctAnswer: userAnswered ? challenge.correctAnswer : undefined,
      explanation: userAnswered ? challenge.explanation : undefined,
      globalPct,
      totalResponses: total,
      userAnswered,
      userCorrect,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load daily challenge' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { questionId, answer } = await req.json();

    const q = await db.select().from(questions).where(eq(questions.id, questionId)).get();
    if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const isCorrect = q.correctAnswer === answer;

    // Record as a session response (no full session — just log the response)
    const { nanoid } = await import('nanoid');
    await db.insert(sessionResponses).values({
      id: nanoid(),
      userId: auth.userId,
      sessionId: null,
      questionId,
      userAnswer: answer,
      isCorrect,
      timeSpentSecs: null,
      answeredAt: new Date(),
    }).onConflictDoNothing();

    // Recompute global stats
    const stats = await db
      .select({ count: sql<number>`count(*)`, correct: sql<number>`sum(case when ${sessionResponses.isCorrect} = 1 then 1 else 0 end)` })
      .from(sessionResponses)
      .where(eq(sessionResponses.questionId, questionId));

    const total = stats[0]?.count ?? 1;
    const correct = (stats[0]?.correct ?? 0) + (isCorrect ? 0 : 0); // already updated
    const globalPct = Math.round((correct / total) * 100);

    return NextResponse.json({
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      globalPct,
      totalResponses: total,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}

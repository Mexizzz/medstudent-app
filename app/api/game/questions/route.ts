import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, contentSources } from '@/db/schema';
import { requireAuth, AuthError } from '@/lib/auth';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const sourceIdsParam = searchParams.get('sourceIds');
    const count = Math.min(parseInt(searchParams.get('count') || '30'), 60);

    // Verify sources belong to this user
    const userSources = await db
      .select({ id: contentSources.id })
      .from(contentSources)
      .where(eq(contentSources.userId, userId));

    const userSourceIds = userSources.map((s) => s.id);
    if (userSourceIds.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    let targetIds = userSourceIds;
    if (sourceIdsParam) {
      const requested = sourceIdsParam.split(',').filter(Boolean);
      targetIds = requested.filter((id) => userSourceIds.includes(id));
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Fetch MCQ questions from the sources
    const rows = await db
      .select({
        id: questions.id,
        question: questions.question,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        topic: questions.topic,
        subject: questions.subject,
        difficulty: questions.difficulty,
      })
      .from(questions)
      .where(
        and(
          inArray(questions.sourceId, targetIds),
          eq(questions.type, 'mcq')
        )
      );

    // Filter out incomplete questions
    const valid = rows.filter(
      (q) => q.question && q.optionA && q.optionB && q.correctAnswer
    );

    // Shuffle and take count
    const shuffled = valid.sort(() => Math.random() - 0.5).slice(0, count);

    return NextResponse.json({ questions: shuffled });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

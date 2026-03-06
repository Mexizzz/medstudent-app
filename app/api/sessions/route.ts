import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studySessions, questions, contentSources } from '@/db/schema';
import { inArray, sql, and, isNotNull, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

/** Shuffle MCQ options so the correct answer isn't always in the same position */
function shuffleMcqOptions<T extends { type: string; optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; correctAnswer: string | null }>(q: T): T {
  if (q.type !== 'mcq' || !q.correctAnswer || !q.optionA) return q;

  const labels = ['A', 'B', 'C', 'D'] as const;
  const options: Record<string, string | null> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
  const correctText = options[q.correctAnswer];

  // Fisher-Yates shuffle of label order
  const shuffled = [...labels];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const newOptions: Record<string, string | null> = {};
  let newCorrect = q.correctAnswer;
  shuffled.forEach((origLabel, idx) => {
    const newLabel = labels[idx];
    newOptions[newLabel] = options[origLabel];
    if (options[origLabel] === correctText) newCorrect = newLabel;
  });

  return {
    ...q,
    optionA: newOptions.A,
    optionB: newOptions.B,
    optionC: newOptions.C,
    optionD: newOptions.D,
    correctAnswer: newCorrect,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = await req.json();
    const { sourceIds, activityTypes, topics: topicFilter, count = 20, planId, questionIds: directIds } = body;

    let pool: (typeof questions.$inferSelect)[];

    if (directIds?.length) {
      // Mode: quiz from specific question IDs (e.g. wrong-answers quiz)
      const rows = await db
        .select()
        .from(questions)
        .where(inArray(questions.id, directIds));
      // Shuffle in JS
      pool = rows.sort(() => Math.random() - 0.5);
    } else {
      if (!sourceIds?.length) {
        return NextResponse.json({ error: 'At least one source required' }, { status: 400 });
      }

      // Verify all sourceIds belong to the current user
      const ownedSources = await db
        .select({ id: contentSources.id })
        .from(contentSources)
        .where(and(inArray(contentSources.id, sourceIds), eq(contentSources.userId, userId)));
      const ownedIds = ownedSources.map(s => s.id);
      if (ownedIds.length === 0) {
        return NextResponse.json({ error: 'No valid sources found' }, { status: 403 });
      }

      const conditions = [inArray(questions.sourceId, ownedIds)];
      if (activityTypes?.length) conditions.push(inArray(questions.type, activityTypes));
      if (topicFilter?.length) conditions.push(inArray(questions.topic, topicFilter));
      const filter = and(...conditions);

      // Fetch a large pool then deduplicate by question content (prevents repeated
      // questions from multiple generation runs on the same source)
      const rawPool = await db
        .select()
        .from(questions)
        .where(filter)
        .orderBy(sql`RANDOM()`)
        .limit(count * 5);

      const seen = new Set<string>();
      pool = rawPool.filter(q => {
        const key = q.question ?? q.front ?? q.blankText ?? q.caseQuestion ?? q.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, count);
    }

    if (pool.length === 0) {
      return NextResponse.json({
        error: 'No questions found. Generate questions for these sources first.'
      }, { status: 400 });
    }

    const sessionId = nanoid();
    const now = new Date();

    await db.insert(studySessions).values({
      id: sessionId,
      userId,
      planId: planId ?? null,
      status: 'active',
      activityTypes: JSON.stringify(activityTypes ?? []),
      sourceIds: JSON.stringify(sourceIds ?? []),
      questionIds: JSON.stringify(pool.map(q => q.id)),
      totalQuestions: pool.length,
      startedAt: now,
    });

    const shuffledPool = pool.map(q => shuffleMcqOptions(q));

    return NextResponse.json({ sessionId, questions: shuffledPool, total: shuffledPool.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Session create error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const sessions = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, userId))
      .orderBy(sql`${studySessions.startedAt} desc`)
      .limit(50);

    return NextResponse.json(sessions);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

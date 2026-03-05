import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studySessions, questions } from '@/db/schema';
import { inArray, sql, and, isNotNull, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

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

      const conditions = [inArray(questions.sourceId, sourceIds)];
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

    return NextResponse.json({ sessionId, questions: pool, total: pool.length });
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

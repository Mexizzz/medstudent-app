import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, studySessions, contentSources } from '@/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { subject, topic } = await req.json();
    if (!subject || !topic) {
      return NextResponse.json({ error: 'subject and topic required' }, { status: 400 });
    }

    // Get user's source IDs to scope questions
    const userSources = await db
      .select({ id: contentSources.id })
      .from(contentSources)
      .where(eq(contentSources.userId, userId));
    const userSourceIds = userSources.map(s => s.id);

    if (userSourceIds.length === 0) {
      return NextResponse.json({ error: 'No content sources found' }, { status: 400 });
    }

    // Fetch up to 15 questions from this weak topic, scoped to user's sources
    const pool = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.subject, subject),
        eq(questions.topic, topic),
        inArray(questions.sourceId, userSourceIds)
      ))
      .orderBy(sql`RANDOM()`)
      .limit(15);

    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions found for this topic' }, { status: 400 });
    }

    const sessionId = nanoid();
    const now = new Date();

    await db.insert(studySessions).values({
      id: sessionId,
      userId,
      status: 'active',
      mode: 'practice',
      activityTypes: JSON.stringify([]),
      sourceIds: JSON.stringify([]),
      questionIds: JSON.stringify(pool.map(q => q.id)),
      totalQuestions: pool.length,
      startedAt: now,
    });

    return NextResponse.json({ sessionId, total: pool.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Weakness drill error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

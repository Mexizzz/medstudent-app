import { NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, studySessions, contentSources, topicPerformance } from '@/db/schema';
import { and, eq, inArray, sql, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, hasFeature } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await requireAuth();
    const tier = await getUserTier(userId);

    if (!hasFeature(tier, 'weak_auto_quiz')) {
      return NextResponse.json({ error: 'Weak Topic Auto-Quiz requires Max', locked: true }, { status: 403 });
    }

    // Get user's weakest topics (bottom 5 by avg score)
    const weakTopics = await db
      .select({ topic: topicPerformance.topic, subject: topicPerformance.subject })
      .from(topicPerformance)
      .where(eq(topicPerformance.userId, userId))
      .orderBy(asc(topicPerformance.avgScore))
      .limit(5);

    if (weakTopics.length === 0) {
      return NextResponse.json({ error: 'Not enough study data. Complete some study sessions first.' }, { status: 400 });
    }

    // Get user's source IDs
    const userSources = await db
      .select({ id: contentSources.id })
      .from(contentSources)
      .where(eq(contentSources.userId, userId));
    const userSourceIds = userSources.map(s => s.id);

    if (userSourceIds.length === 0) {
      return NextResponse.json({ error: 'No content sources found' }, { status: 400 });
    }

    // Fetch questions from weak topics
    const topicConditions = weakTopics.map(t =>
      and(eq(questions.subject, t.subject!), eq(questions.topic, t.topic))
    );

    const pool = await db
      .select()
      .from(questions)
      .where(and(
        inArray(questions.sourceId, userSourceIds),
        sql`(${sql.join(topicConditions.map(c => sql`(${c})`), sql` OR `)})`
      ))
      .orderBy(sql`RANDOM()`)
      .limit(20);

    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions found for your weak topics' }, { status: 400 });
    }

    const sessionId = nanoid();
    await db.insert(studySessions).values({
      id: sessionId,
      userId,
      status: 'active',
      mode: 'practice',
      activityTypes: JSON.stringify([]),
      sourceIds: JSON.stringify([]),
      questionIds: JSON.stringify(pool.map(q => q.id)),
      totalQuestions: pool.length,
      startedAt: new Date(),
    });

    return NextResponse.json({
      sessionId,
      total: pool.length,
      topics: weakTopics.map(t => t.topic),
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Auto-quiz error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { streakRecords, studySessions, topicPerformance } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, hasFeature } from '@/lib/subscription';
import { eq, sql, and, desc } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const tier = await getUserTier(userId);

    if (!hasFeature(tier, 'study_insights')) {
      return NextResponse.json({ error: 'Study Insights requires Pro or Max', locked: true }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const weekAgo = now - 7 * 86400;
    const twoWeeksAgo = now - 14 * 86400;

    // This week's sessions
    const thisWeekSessions = await db
      .select({
        count: sql<number>`count(*)`,
        avgScore: sql<number>`round(avg(score), 1)`,
        totalCorrect: sql<number>`sum(correct_count)`,
        totalQuestions: sql<number>`sum(total_questions)`,
      })
      .from(studySessions)
      .where(and(
        eq(studySessions.userId, userId),
        eq(studySessions.status, 'completed'),
        sql`started_at > ${weekAgo}`
      ));

    // Last week's sessions for comparison
    const lastWeekSessions = await db
      .select({
        count: sql<number>`count(*)`,
        avgScore: sql<number>`round(avg(score), 1)`,
      })
      .from(studySessions)
      .where(and(
        eq(studySessions.userId, userId),
        eq(studySessions.status, 'completed'),
        sql`started_at > ${twoWeeksAgo}`,
        sql`started_at <= ${weekAgo}`
      ));

    // Study time from streak records
    const today = new Date().toISOString().split('T')[0];
    const weekAgoDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const twoWeeksAgoDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    const thisWeekTime = await db
      .select({ totalMins: sql<number>`coalesce(sum(total_minutes), 0)`, studyDays: sql<number>`count(*)` })
      .from(streakRecords)
      .where(and(eq(streakRecords.userId, userId), sql`date >= ${weekAgoDate}`));

    const lastWeekTime = await db
      .select({ totalMins: sql<number>`coalesce(sum(total_minutes), 0)` })
      .from(streakRecords)
      .where(and(eq(streakRecords.userId, userId), sql`date >= ${twoWeeksAgoDate}`, sql`date < ${weekAgoDate}`));

    // Topic performance — top improved and weakest
    const topics = await db
      .select({
        topic: topicPerformance.topic,
        subject: topicPerformance.subject,
        avgScore: topicPerformance.avgScore,
        totalAttempts: topicPerformance.totalAttempts,
      })
      .from(topicPerformance)
      .where(eq(topicPerformance.userId, userId))
      .orderBy(topicPerformance.avgScore);

    const weakTopics = topics.slice(0, 5);
    const strongTopics = [...topics].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).slice(0, 5);

    const tw = thisWeekSessions[0];
    const lw = lastWeekSessions[0];
    const twTime = thisWeekTime[0];
    const lwTime = lastWeekTime[0];

    return NextResponse.json({
      thisWeek: {
        sessions: tw?.count ?? 0,
        avgScore: tw?.avgScore ?? null,
        totalCorrect: tw?.totalCorrect ?? 0,
        totalQuestions: tw?.totalQuestions ?? 0,
        studyMinutes: twTime?.totalMins ?? 0,
        studyDays: twTime?.studyDays ?? 0,
      },
      lastWeek: {
        sessions: lw?.count ?? 0,
        avgScore: lw?.avgScore ?? null,
        studyMinutes: lwTime?.totalMins ?? 0,
      },
      weakTopics,
      strongTopics,
      tier,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

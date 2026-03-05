import { NextResponse } from 'next/server';
import { db } from '@/db';
import { topicPerformance, studySessions, sessionResponses } from '@/db/schema';
import { sql, desc, eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    // All topic performance rows
    const topics = await db
      .select()
      .from(topicPerformance)
      .where(eq(topicPerformance.userId, userId))
      .orderBy(sql`${topicPerformance.avgScore} asc`);

    // Aggregate by subject
    const subjectMap = new Map<string, { totalAttempts: number; correctAttempts: number }>();
    for (const t of topics) {
      const key = t.subject;
      const s = subjectMap.get(key) ?? { totalAttempts: 0, correctAttempts: 0 };
      s.totalAttempts += t.totalAttempts ?? 0;
      s.correctAttempts += t.correctAttempts ?? 0;
      subjectMap.set(key, s);
    }

    const bySubject = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      avgScore: data.totalAttempts > 0 ? (data.correctAttempts / data.totalAttempts) * 100 : 0,
      totalAttempts: data.totalAttempts,
    }));

    // Recent sessions for line chart
    const recentSessions = await db
      .select({
        id: studySessions.id,
        score: studySessions.score,
        startedAt: studySessions.startedAt,
        totalQuestions: studySessions.totalQuestions,
        correctCount: studySessions.correctCount,
      })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), sql`${studySessions.status} = 'completed'`))
      .orderBy(desc(studySessions.startedAt))
      .limit(30);

    // Weak and strong topics
    const weakTopics = topics.filter(t => (t.totalAttempts ?? 0) >= 3).slice(0, 5);
    const strongTopics = [...topics]
      .filter(t => (t.totalAttempts ?? 0) >= 3)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
      .slice(0, 5);

    return NextResponse.json({
      bySubject,
      byTopic: topics,
      overTime: recentSessions.reverse(),
      weakTopics,
      strongTopics,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

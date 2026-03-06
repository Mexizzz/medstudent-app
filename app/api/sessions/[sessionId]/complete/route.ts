import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studySessions, sessionResponses, topicPerformance, srCards, userXp } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { markTodayStudied } from '@/lib/streak';
import { calculateSM2, todayStr } from '@/lib/sr';
import { calcSessionXp, getXpProgress } from '@/lib/xp';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

interface ResponseInput {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  aiScore?: number;
  aiFeedback?: string;
  timeSpentSecs?: number;
  subject?: string;
  topic?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await requireAuth();

    const { sessionId } = await params;
    const { responses, durationSeconds }: { responses: ResponseInput[]; durationSeconds: number } = await req.json();

    const session = await db.query.studySessions.findFirst({
      where: (s, { eq, and }) => and(eq(s.id, sessionId), eq(s.userId, userId)),
    });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const now = new Date();

    // Insert all responses
    const responseRows = responses.map(r => ({
      id: nanoid(),
      sessionId,
      userId,
      questionId: r.questionId,
      userAnswer: r.userAnswer,
      isCorrect: r.isCorrect,
      aiScore: r.aiScore ?? null,
      aiFeedback: r.aiFeedback ?? null,
      timeSpentSecs: r.timeSpentSecs ?? null,
      answeredAt: now,
    }));

    if (responseRows.length > 0) {
      await db.insert(sessionResponses).values(responseRows);
    }

    // Calculate score
    const totalAnswered = responses.length;
    const correctCount = responses.filter(r => r.isCorrect).length;
    const score = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

    // Update session
    await db.update(studySessions)
      .set({
        status: 'completed',
        correctCount,
        score,
        durationSeconds: durationSeconds ?? 0,
        completedAt: now,
      })
      .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)));

    // Update topic_performance
    const topicMap = new Map<string, { subject: string; topic: string; correct: number; total: number }>();

    for (const r of responses) {
      if (!r.subject || !r.topic) continue;
      const key = `${r.subject}::${r.topic}`;
      const existing = topicMap.get(key) ?? { subject: r.subject, topic: r.topic, correct: 0, total: 0 };
      existing.total++;
      if (r.isCorrect) existing.correct++;
      topicMap.set(key, existing);
    }

    for (const [, tp] of topicMap) {
      const existing = await db.query.topicPerformance.findFirst({
        where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.subject, tp.subject), eq(t.topic, tp.topic)),
      });

      if (existing) {
        const newTotal = (existing.totalAttempts ?? 0) + tp.total;
        const newCorrect = (existing.correctAttempts ?? 0) + tp.correct;
        await db.update(topicPerformance)
          .set({
            totalAttempts: newTotal,
            correctAttempts: newCorrect,
            avgScore: newTotal > 0 ? (newCorrect / newTotal) * 100 : 0,
            lastStudiedAt: now,
            updatedAt: now,
          })
          .where(eq(topicPerformance.id, existing.id));
      } else {
        await db.insert(topicPerformance).values({
          id: nanoid(),
          userId,
          subject: tp.subject,
          topic: tp.topic,
          totalAttempts: tp.total,
          correctAttempts: tp.correct,
          avgScore: tp.total > 0 ? (tp.correct / tp.total) * 100 : 0,
          lastStudiedAt: now,
          updatedAt: now,
        });
      }
    }

    // Update SR cards for each answered question
    const today = todayStr();
    for (const r of responses) {
      if (!r.questionId) continue;
      const quality = r.isCorrect ? 5 : 1;
      const [existing] = await db.select().from(srCards).where(and(eq(srCards.questionId, r.questionId), eq(srCards.userId, userId))).limit(1);
      const cardInput = existing ?? { easeFactor: 2.5, interval: 1, repetitions: 0 };
      const updated = calculateSM2(cardInput, quality);
      if (existing) {
        await db.update(srCards).set({
          easeFactor: updated.easeFactor,
          interval: updated.interval,
          repetitions: updated.repetitions,
          nextReviewDate: updated.nextReviewDate,
          lastReviewDate: updated.lastReviewDate,
        }).where(eq(srCards.id, existing.id));
      } else {
        await db.insert(srCards).values({
          id: nanoid(),
          userId,
          questionId: r.questionId,
          easeFactor: updated.easeFactor,
          interval: updated.interval,
          repetitions: updated.repetitions,
          nextReviewDate: updated.nextReviewDate,
          lastReviewDate: updated.lastReviewDate,
          createdAt: new Date(),
        });
      }
    }

    // Mark streak
    const durationMins = Math.ceil((durationSeconds ?? 0) / 60);
    await markTodayStudied(durationMins, userId);

    // Award XP
    const isExam = session.mode === 'exam';
    const xpEarned = calcSessionXp(correctCount, totalAnswered, isExam);
    const xpNow = new Date();
    const xpUpdated = await db
      .update(userXp)
      .set({ totalXp: sql`${userXp.totalXp} + ${xpEarned}`, updatedAt: xpNow })
      .where(eq(userXp.userId, userId))
      .returning();
    if (xpUpdated.length === 0) {
      await db.insert(userXp).values({ id: nanoid(), userId, totalXp: xpEarned, updatedAt: xpNow });
    }
    const xpRows = await db.select().from(userXp).where(eq(userXp.userId, userId));
    const xpProgress = getXpProgress(xpRows[0]?.totalXp ?? xpEarned);

    return NextResponse.json({ score, correctCount, totalAnswered, xpEarned, xpProgress });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Session complete error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { studyPlanItems, srCards, studyGoals, userXp, users } from '@/db/schema';
import { getStreakInfo } from '@/lib/streak';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { todayString } from '@/lib/utils';
import { todayStr } from '@/lib/sr';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const today = todayStr();

    const userRow = db.select({ name: users.name, tier: users.subscriptionTier }).from(users).where(eq(users.id, userId)).get();
    const userName = userRow?.name || '';
    const userTier = userRow?.tier || 'free';

    const [streakInfo, todayPlans, allSrCards, goals, xpRows] = await Promise.all([
      getStreakInfo(userId).catch(() => ({
        currentStreak: 0, longestStreak: 0, totalStudyDays: 0,
        todayComplete: false, last7Days: [],
      })),
      db.query.studyPlanItems.findMany({
        where: (p, { eq: e, and: a }) => a(e(p.userId, userId), e(p.planDate, todayString())),
      }),
      db.select().from(srCards).where(eq(srCards.userId, userId)),
      db.select().from(studyGoals).where(eq(studyGoals.userId, userId)).limit(1),
      db.select().from(userXp).where(eq(userXp.userId, userId)),
    ]);

    const xpProgress = getXpProgress(xpRows[0]?.totalXp ?? 0);
    const dueCount = allSrCards.filter(c => c.nextReviewDate <= today).length;
    const totalSrCards = allSrCards.length;
    const goal = goals[0] ?? null;

    let daysUntilExam: number | null = null;
    if (goal?.targetExamDate) {
      const diff = Math.ceil((new Date(goal.targetExamDate).getTime() - Date.now()) / 86400000);
      daysUntilExam = Math.max(0, diff);
    }

    return NextResponse.json({
      userName,
      userTier,
      streakInfo,
      todayPlans,
      xpProgress,
      dueCount,
      totalSrCards,
      goal,
      daysUntilExam,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { db } from '@/db';
import { streakRecords } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { todayString } from './utils';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  todayComplete: boolean;
  last7Days: { date: string; studied: boolean }[];
}

export async function getStreakInfo(userId: string): Promise<StreakInfo> {
  const records = await db
    .select({ studyDate: streakRecords.studyDate })
    .from(streakRecords)
    .where(eq(streakRecords.userId, userId))
    .orderBy(desc(streakRecords.studyDate));

  const studiedDates = new Set(records.map(r => r.studyDate));
  const today = todayString();

  // Calculate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, studied: studiedDates.has(dateStr) };
  }).reverse();

  // Current streak: consecutive days ending today (or yesterday)
  let currentStreak = 0;
  const startDate = studiedDates.has(today)
    ? new Date(today)
    : (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.toISOString().split('T')[0];
        return studiedDates.has(ys) ? yesterday : null;
      })();

  if (startDate) {
    let checkDate = new Date(startDate);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!studiedDates.has(dateStr)) break;
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  const sortedDates = [...studiedDates].sort();
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    if (prevDate) {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    prevDate = d;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalStudyDays: studiedDates.size,
    todayComplete: studiedDates.has(today),
    last7Days,
  };
}

export async function markTodayStudied(durationMinutes: number, userId: string): Promise<void> {
  const { nanoid } = await import('nanoid');
  const today = todayString();
  const now = new Date();

  // Upsert: if today exists, increment; otherwise insert
  const existing = await db.query.streakRecords.findFirst({
    where: (r, { eq, and }) => and(eq(r.userId, userId), eq(r.studyDate, today)),
  });

  if (existing) {
    await db
      .update(streakRecords)
      .set({
        sessionsCount: (existing.sessionsCount ?? 0) + 1,
        totalMinutes: (existing.totalMinutes ?? 0) + durationMinutes,
      })
      .where(
        (await import('drizzle-orm')).eq(streakRecords.id, existing.id)
      );
  } else {
    await db.insert(streakRecords).values({
      id: nanoid(),
      userId,
      studyDate: today,
      sessionsCount: 1,
      totalMinutes: durationMinutes,
      createdAt: now,
    });
  }
}

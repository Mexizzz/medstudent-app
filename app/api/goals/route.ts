import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyGoals } from '@/db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const goals = await db.select().from(studyGoals).where(eq(studyGoals.userId, userId)).limit(1);
    return NextResponse.json({ goal: goals[0] ?? null });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = await req.json();
    const { examType, targetExamDate, weeklyHoursTarget, targetSubjects } = body;

    const now = new Date();
    const existing = await db.select().from(studyGoals).where(eq(studyGoals.userId, userId)).limit(1);

    if (existing.length > 0) {
      await db.update(studyGoals).set({
        examType: examType ?? null,
        targetExamDate: targetExamDate ?? null,
        weeklyHoursTarget: weeklyHoursTarget ?? 10,
        targetSubjects: targetSubjects ? JSON.stringify(targetSubjects) : null,
        updatedAt: now,
      }).where(eq(studyGoals.userId, userId));
      return NextResponse.json({ ok: true });
    }

    await db.insert(studyGoals).values({
      id: nanoid(),
      userId,
      examType: examType ?? null,
      targetExamDate: targetExamDate ?? null,
      weeklyHoursTarget: weeklyHoursTarget ?? 10,
      targetSubjects: targetSubjects ? JSON.stringify(targetSubjects) : null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

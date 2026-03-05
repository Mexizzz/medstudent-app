import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyGoals } from '@/db/schema';
import { nanoid } from 'nanoid';

export async function GET() {
  const goals = await db.select().from(studyGoals).limit(1);
  return NextResponse.json({ goal: goals[0] ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { examType, targetExamDate, weeklyHoursTarget, targetSubjects } = body;

  const now = new Date();
  const existing = await db.select().from(studyGoals).limit(1);

  if (existing.length > 0) {
    await db.update(studyGoals).set({
      examType: examType ?? null,
      targetExamDate: targetExamDate ?? null,
      weeklyHoursTarget: weeklyHoursTarget ?? 10,
      targetSubjects: targetSubjects ? JSON.stringify(targetSubjects) : null,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true });
  }

  await db.insert(studyGoals).values({
    id: nanoid(),
    examType: examType ?? null,
    targetExamDate: targetExamDate ?? null,
    weeklyHoursTarget: weeklyHoursTarget ?? 10,
    targetSubjects: targetSubjects ? JSON.stringify(targetSubjects) : null,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ ok: true });
}

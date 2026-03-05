import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studyPlanItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const plans = await db.query.studyPlanItems.findMany({
    where: (p, { eq }) => eq(p.planDate, date),
  });
  return NextResponse.json(plans);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const { title, sourceIds, activityTypes, questionCount } = await req.json();

  if (!title || !sourceIds?.length || !activityTypes?.length) {
    return NextResponse.json({ error: 'title, sourceIds, and activityTypes required' }, { status: 400 });
  }

  const now = new Date();
  const id = nanoid();

  await db.insert(studyPlanItems).values({
    id,
    planDate: date,
    title,
    sourceIds: JSON.stringify(sourceIds),
    activityTypes: JSON.stringify(activityTypes),
    questionCount: questionCount ?? 20,
    isCompleted: false,
    createdAt: now,
  });

  return NextResponse.json({ id });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const body = await req.json();
  const { id, title, sourceIds, activityTypes, questionCount, isCompleted } = body;

  if (!id) return NextResponse.json({ error: 'Plan item id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (sourceIds !== undefined) updates.sourceIds = JSON.stringify(sourceIds);
  if (activityTypes !== undefined) updates.activityTypes = JSON.stringify(activityTypes);
  if (questionCount !== undefined) updates.questionCount = questionCount;
  if (isCompleted !== undefined) {
    updates.isCompleted = isCompleted;
    if (isCompleted) updates.completedAt = new Date();
  }

  await db.update(studyPlanItems).set(updates).where(eq(studyPlanItems.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db.delete(studyPlanItems).where(eq(studyPlanItems.id, id));
  return NextResponse.json({ success: true });
}

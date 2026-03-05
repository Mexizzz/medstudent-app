import { NextResponse } from 'next/server';
import { db } from '@/db';
import { studyPlanItems } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const plans = await db
      .select()
      .from(studyPlanItems)
      .where(eq(studyPlanItems.userId, userId))
      .orderBy(sql`${studyPlanItems.planDate} asc`);

    return NextResponse.json(plans);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

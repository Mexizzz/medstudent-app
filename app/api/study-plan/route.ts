import { NextResponse } from 'next/server';
import { db } from '@/db';
import { studyPlanItems } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  const plans = await db
    .select()
    .from(studyPlanItems)
    .orderBy(sql`${studyPlanItems.planDate} asc`);

  return NextResponse.json(plans);
}

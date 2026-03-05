import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userXp } from '@/db/schema';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(userXp).where(eq(userXp.id, 1));
    const totalXp = rows[0]?.totalXp ?? 0;
    return NextResponse.json(getXpProgress(totalXp));
  } catch {
    return NextResponse.json(getXpProgress(0));
  }
}

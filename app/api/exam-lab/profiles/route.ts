import { NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const profiles = await db.select().from(examProfiles).where(eq(examProfiles.userId, userId)).orderBy(desc(examProfiles.createdAt));
    return NextResponse.json({ profiles });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

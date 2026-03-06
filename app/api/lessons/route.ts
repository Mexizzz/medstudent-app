import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        topic: lessons.topic,
        overview: lessons.overview,
        createdAt: lessons.createdAt,
      })
      .from(lessons)
      .where(eq(lessons.userId, userId))
      .orderBy(desc(lessons.createdAt));

    return NextResponse.json({ lessons: rows });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

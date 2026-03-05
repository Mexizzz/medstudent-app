import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        topic: lessons.topic,
        overview: lessons.overview,
        createdAt: lessons.createdAt,
      })
      .from(lessons)
      .orderBy(desc(lessons.createdAt));

    return NextResponse.json({ lessons: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

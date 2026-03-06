import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summaries } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db
      .select({
        id:          summaries.id,
        title:       summaries.title,
        subject:     summaries.subject,
        topic:       summaries.topic,
        aiScore:     summaries.aiScore,
        createdAt:   summaries.createdAt,
        updatedAt:   summaries.updatedAt,
      })
      .from(summaries)
      .where(eq(summaries.userId, userId))
      .orderBy(desc(summaries.updatedAt));

    return NextResponse.json(rows);
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
    const { title, subject, topic, canvasData, textContent } = body;

    const now = new Date();
    const [row] = await db.insert(summaries).values({
      id:          nanoid(),
      userId,
      title:       (title?.trim() || 'Untitled Summary'),
      subject:     subject || null,
      topic:       topic || null,
      canvasData:  canvasData || null,
      textContent: textContent || null,
      createdAt:   now,
      updatedAt:   now,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

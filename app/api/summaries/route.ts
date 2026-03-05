import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summaries } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
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
    .orderBy(desc(summaries.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, subject, topic, canvasData, textContent } = body;

  const now = new Date();
  const [row] = await db.insert(summaries).values({
    id:          nanoid(),
    title:       (title?.trim() || 'Untitled Summary'),
    subject:     subject || null,
    topic:       topic || null,
    canvasData:  canvasData || null,
    textContent: textContent || null,
    createdAt:   now,
    updatedAt:   now,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}

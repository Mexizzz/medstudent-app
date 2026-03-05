import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summaries } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(summaries).where(eq(summaries.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { title, subject, topic, canvasData, textContent } = body;

  await db.update(summaries).set({
    title:       title?.trim() || 'Untitled Summary',
    subject:     subject || null,
    topic:       topic || null,
    canvasData:  canvasData ?? undefined,
    textContent: textContent ?? undefined,
    updatedAt:   new Date(),
  }).where(eq(summaries.id, id));

  const [row] = await db.select().from(summaries).where(eq(summaries.id, id));
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(summaries).where(eq(summaries.id, id));
  return NextResponse.json({ ok: true });
}

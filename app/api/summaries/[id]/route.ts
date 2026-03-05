import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summaries } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    const [row] = await db.select().from(summaries).where(and(eq(summaries.id, id), eq(summaries.userId, userId)));
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();

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
    }).where(and(eq(summaries.id, id), eq(summaries.userId, userId)));

    const [row] = await db.select().from(summaries).where(and(eq(summaries.id, id), eq(summaries.userId, userId)));
    return NextResponse.json(row);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    await db.delete(summaries).where(and(eq(summaries.id, id), eq(summaries.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

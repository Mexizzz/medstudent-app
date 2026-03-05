import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs/promises';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    await requireAuth();

    const { sourceId } = await params;
    const source = await db.query.contentSources.findFirst({
      where: (s, { eq }) => eq(s.id, sourceId),
    });

    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Question counts per type
    const counts = await db
      .select({ type: questions.type, count: sql<number>`count(*)` })
      .from(questions)
      .where(eq(questions.sourceId, sourceId))
      .groupBy(questions.type);

    return NextResponse.json({ ...source, questionCounts: counts });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    await requireAuth();

    const { sourceId } = await params;
    const source = await db.query.contentSources.findFirst({
      where: (s, { eq }) => eq(s.id, sourceId),
    });

    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete file from disk if it's a PDF
    if (source.filePath) {
      try { await fs.unlink(source.filePath); } catch {}
    }

    await db.delete(contentSources).where(eq(contentSources.id, sourceId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

export async function GET_list() {
  // This is handled by the list route
}

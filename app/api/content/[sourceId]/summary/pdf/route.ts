import { NextResponse } from 'next/server';
import { db, sqlite } from '@/db';
import { contentSources, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireAuth, AuthError } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { SummaryPdfDocument } from '@/lib/summaryPdf';
import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { sourceId } = await params;

    const source = await db
      .select({ title: contentSources.title, subject: contentSources.subject, topic: contentSources.topic })
      .from(contentSources)
      .where(and(eq(contentSources.id, sourceId), eq(contentSources.userId, userId)))
      .get();
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const row = sqlite.prepare(
      'SELECT content FROM source_summaries WHERE source_id = ? AND user_id = ?'
    ).get(sourceId, userId) as any;
    if (!row || !row.content) {
      return NextResponse.json({ error: 'No summary generated yet' }, { status: 404 });
    }

    const userRow = await db
      .select({ name: users.name, email: users.email })
      .from(users).where(eq(users.id, userId)).get();

    const element = React.createElement(SummaryPdfDocument, {
      title: source.title,
      subject: source.subject ?? null,
      topic: source.topic ?? null,
      markdown: row.content,
      generatedAt: new Date(),
      studentName: userRow?.name || (userRow?.email ? userRow.email.split('@')[0] : null),
    });

    const buffer = await renderToBuffer(element as any);
    const filename = (source.title || 'summary')
      .replace(/[^a-z0-9\-_ ]+/gi, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'summary';

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}-summary.pdf"`,
      },
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('PDF export error:', e);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

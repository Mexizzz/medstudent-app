import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { generateMCQs, parseMcqPdf } from '@/lib/ai/generators';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { sourceId, count = 10, difficulty = 'medium', focusTopic } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found or has no text' }, { status: 404 });

    // MCQ PDFs: parse existing questions instead of generating new ones
    const generated = source.type === 'mcq_pdf'
      ? await parseMcqPdf(source.rawText)
      : await generateMCQs(source.rawText, count, source.subject ?? 'Medicine', source.topic ?? 'General', difficulty, focusTopic);

    const now = new Date();
    const rows = generated.map(q => ({
      id: nanoid(),
      sourceId,
      type: 'mcq' as const,
      subject: source.subject,
      topic: q.topic || source.topic,
      difficulty: q.difficulty || difficulty,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      createdAt: now,
    }));

    if (rows.length > 0) {
      await db.insert(questions).values(rows);
    }

    return NextResponse.json({ generated: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('MCQ generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

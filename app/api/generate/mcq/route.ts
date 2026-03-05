import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { generateMCQs, parseMcqPdf } from '@/lib/ai/generators';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { sourceId, count = 10, difficulty = 'medium' } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq }) => eq(s.id, sourceId),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found or has no text' }, { status: 404 });

    // MCQ PDFs: parse existing questions instead of generating new ones
    const generated = source.type === 'mcq_pdf'
      ? await parseMcqPdf(source.rawText)
      : await generateMCQs(source.rawText, count, source.subject ?? 'Medicine', source.topic ?? 'General', difficulty);

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
  } catch (err) {
    console.error('MCQ generate error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

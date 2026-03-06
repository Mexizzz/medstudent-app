import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { generateShortAnswers } from '@/lib/ai/generators';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { sourceId, count = 10, difficulty = 'medium', focusTopic } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq }) => eq(s.id, sourceId),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const generated = await generateShortAnswers(
      source.rawText, count, source.subject ?? 'Medicine', source.topic ?? 'General', difficulty, focusTopic
    );

    const now = new Date();
    const rows = generated.map(q => ({
      id: nanoid(),
      sourceId,
      type: 'short_answer' as const,
      subject: source.subject,
      topic: q.topic || source.topic,
      difficulty: q.difficulty || difficulty,
      question: q.question,
      modelAnswer: q.modelAnswer,
      keyPoints: JSON.stringify(q.keyPoints),
      createdAt: now,
    }));

    if (rows.length > 0) await db.insert(questions).values(rows);
    return NextResponse.json({ generated: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Short answer generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

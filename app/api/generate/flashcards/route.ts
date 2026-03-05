import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { generateFlashcards } from '@/lib/ai/generators';
import { nanoid } from 'nanoid';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { sourceId, count = 20 } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq }) => eq(s.id, sourceId),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const generated = await generateFlashcards(
      source.rawText, count, source.subject ?? 'Medicine', source.topic ?? 'General'
    );

    const now = new Date();
    const rows = generated.map(q => ({
      id: nanoid(),
      sourceId,
      type: 'flashcard' as const,
      subject: source.subject,
      topic: q.topic || source.topic,
      front: q.front,
      back: q.back,
      cardType: q.cardType,
      createdAt: now,
    }));

    if (rows.length > 0) await db.insert(questions).values(rows);
    return NextResponse.json({ generated: rows.length });
  } catch (err) {
    console.error('Flashcard generate error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

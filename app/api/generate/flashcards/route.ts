import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { generateFlashcards } from '@/lib/ai/generators';
import { getSourceText } from '@/lib/content/source-text';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { checkUsageLimit, incrementUsage } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { allowed, used, limit, tier } = await checkUsageLimit(userId, 'question_generate');
    if (!allowed) {
      return NextResponse.json({ error: 'Daily question generation limit reached', upgradeRequired: true, used, limit, tier }, { status: 429 });
    }

    const { sourceId, count = 20, focusTopic, pageFrom, pageTo } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const text = await getSourceText(source, pageFrom, pageTo);

    const generated = await generateFlashcards(
      text, count, source.subject ?? 'Medicine', source.topic ?? 'General', focusTopic
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

    if (rows.length > 0) {
      await db.insert(questions).values(rows);
      await incrementUsage(userId, 'question_generate', rows.length);
    }
    return NextResponse.json({ generated: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Flashcard generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

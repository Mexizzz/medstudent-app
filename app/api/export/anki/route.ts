import { NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, contentSources } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'flashcard'; // 'flashcard' | 'mcq' | 'all'

    // Get all user's content source IDs
    const sources = await db
      .select({ id: contentSources.id, title: contentSources.title, subject: contentSources.subject })
      .from(contentSources)
      .where(eq(contentSources.userId, userId));

    const sourceIds = sources.map(s => s.id);
    if (sourceIds.length === 0) {
      return NextResponse.json({ error: 'No content sources found' }, { status: 404 });
    }

    // Fetch all questions for user's sources
    const cards: (typeof questions.$inferSelect)[] = [];
    for (const sid of sourceIds) {
      const qs = await db.select().from(questions).where(eq(questions.sourceId, sid));
      cards.push(...qs);
    }

    const filtered = type === 'all' ? cards : cards.filter(c => c.type === type);

    if (filtered.length === 0) {
      return NextResponse.json({ error: `No ${type} cards found. Generate some first.` }, { status: 404 });
    }

    // Build Anki-compatible tab-separated text
    const lines: string[] = [
      '#separator:tab',
      '#html:false',
      '#columns:Front\tBack\tTags',
    ];

    for (const card of filtered) {
      const sourceTitle = sources.find(s => s.id === card.sourceId)?.title ?? '';
      const tags = ['medstudy', card.subject, card.topic, sourceTitle]
        .filter(Boolean)
        .map(t => t!.replace(/\s+/g, '_'))
        .join(' ');

      if (card.type === 'flashcard' && card.front && card.back) {
        lines.push(`${escape(card.front)}\t${escape(card.back)}\t${tags}`);
      } else if (card.type === 'mcq' && card.question && card.correctAnswer) {
        const options = [
          card.optionA && `A) ${card.optionA}`,
          card.optionB && `B) ${card.optionB}`,
          card.optionC && `C) ${card.optionC}`,
          card.optionD && `D) ${card.optionD}`,
        ].filter(Boolean).join('  |  ');
        const back = `Answer: ${card.correctAnswer}${card.explanation ? `\n\n${card.explanation}` : ''}`;
        lines.push(`${escape(card.question)}\n${options}\t${escape(back)}\t${tags}`);
      } else if (card.type === 'fill_blank' && card.blankText && card.blankAnswer) {
        lines.push(`${escape(card.blankText)}\t${escape(card.blankAnswer)}\t${tags}`);
      }
    }

    const content = lines.join('\n');
    const today = new Date().toISOString().slice(0, 10);

    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="medstudy-${type}-${today}.txt"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function escape(s: string): string {
  return s.replace(/\t/g, ' ').replace(/\n/g, ' ');
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { GeneratedLabQuestion } from '@/lib/exam-lab';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { title, subject, generatedQuestions, existingSourceId } = await req.json() as {
      title: string;
      subject?: string;
      generatedQuestions: GeneratedLabQuestion[];
      existingSourceId?: string;
    };

    if (!generatedQuestions?.length) return NextResponse.json({ error: 'No questions provided' }, { status: 400 });

    const now = new Date();

    let sourceId: string;

    if (existingSourceId) {
      // Append to existing source — just update its timestamp
      sourceId = existingSourceId;
      await db.update(contentSources)
        .set({ updatedAt: now })
        .where(eq(contentSources.id, existingSourceId));
    } else {
      // Create new content source
      if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
      sourceId = nanoid();
      await db.insert(contentSources).values({
        id: sourceId,
        type: 'exam_lab',
        title: title.trim(),
        subject: subject?.trim() || null,
        topic: null,
        rawText: generatedQuestions.map(q => q.question).join('\n\n'),
        wordCount: 0,
        pageCount: 0,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert questions — handle mcq, short_answer, structured, table types
    const rows = generatedQuestions.map(q => {
      const diff = (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium') as 'easy' | 'medium' | 'hard';
      const base = {
        id: nanoid(),
        sourceId,
        subject: subject?.trim() || null,
        topic: q.topic || null,
        difficulty: diff,
        question: q.question,
        createdAt: now,
      };
      if (q.type === 'short_answer') {
        // Detect sub-type from flags so library shows correct label
        const subtype = q.tableFormat ? 'table' : q.structured ? 'structured' : 'short_answer';
        return {
          ...base,
          type: subtype,
          modelAnswer: q.modelAnswer || null,
          keyPoints: q.keyPoints?.length ? JSON.stringify(q.keyPoints) : null,
        };
      }
      return {
        ...base,
        type: 'mcq' as const,
        optionA: q.optionA || null,
        optionB: q.optionB || null,
        optionC: q.optionC || null,
        optionD: q.optionD || null,
        correctAnswer: q.correctAnswer || null,
        explanation: q.explanation || null,
      };
    });

    await db.insert(questions).values(rows);

    return NextResponse.json({ sourceId, count: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Exam save error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

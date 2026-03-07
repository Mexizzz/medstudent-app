import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { generateMCQs, parseMcqPdf } from '@/lib/ai/generators';
import { getSourceText } from '@/lib/content/source-text';
import { ocrPdf } from '@/lib/content/pdf-ocr';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { sourceId, count = 10, difficulty = 'medium', focusTopic, pageFrom, pageTo } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    let text = await getSourceText(source, pageFrom, pageTo);

    // If text extraction yielded very little content and we have a PDF file, try OCR
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 100 && source.filePath && (source.type === 'pdf' || source.type === 'mcq_pdf')) {
      try {
        console.log(`Text extraction too sparse (${wordCount} words), falling back to OCR...`);
        const ocrText = await ocrPdf(source.filePath);
        if (ocrText.trim()) text = ocrText;
      } catch (e) {
        console.warn('OCR fallback failed, using original text:', e);
      }
    }

    if (!text.trim()) return NextResponse.json({ error: 'Could not extract text from source' }, { status: 400 });

    // MCQ PDFs: parse existing questions instead of generating new ones
    const generated = source.type === 'mcq_pdf'
      ? await parseMcqPdf(text)
      : await generateMCQs(text, count, source.subject ?? 'Medicine', source.topic ?? 'General', difficulty, focusTopic);

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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { evaluateShortAnswer } from '@/lib/ai/generators';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { questionId, userAnswer } = await req.json();

    if (!questionId || !userAnswer) {
      return NextResponse.json({ error: 'questionId and userAnswer required' }, { status: 400 });
    }

    const question = await db.query.questions.findFirst({
      where: (q, { eq }) => eq(q.id, questionId),
    });

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    if (!question.modelAnswer) {
      return NextResponse.json({ error: 'This question has no model answer' }, { status: 400 });
    }

    const keyPoints: string[] = question.keyPoints ? JSON.parse(question.keyPoints) : [];

    const result = await evaluateShortAnswer(
      question.question ?? '',
      question.modelAnswer,
      keyPoints,
      userAnswer
    );

    return NextResponse.json(result);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Evaluate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, studySessions } from '@/db/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

function shuffleMcqOptions<T extends { type: string; optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; correctAnswer: string | null }>(q: T): T {
  if (q.type !== 'mcq' || !q.correctAnswer || !q.optionA) return q;
  const labels = ['A', 'B', 'C', 'D'] as const;
  const options: Record<string, string | null> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
  const correctText = options[q.correctAnswer];
  const shuffled = [...labels];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newOptions: Record<string, string | null> = {};
  let newCorrect = q.correctAnswer;
  shuffled.forEach((origLabel, idx) => {
    const newLabel = labels[idx];
    newOptions[newLabel] = options[origLabel];
    if (options[origLabel] === correctText) newCorrect = newLabel;
  });
  return { ...q, optionA: newOptions.A, optionB: newOptions.B, optionC: newOptions.C, optionD: newOptions.D, correctAnswer: newCorrect };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await requireAuth();

    const { sessionId } = await params;

    const session = await db.query.studySessions.findFirst({
      where: (s, { eq, and }) => and(eq(s.id, sessionId), eq(s.userId, userId)),
    });

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const questionIds: string[] = session.questionIds ? JSON.parse(session.questionIds) : [];
    const sessionQuestions = questionIds.length > 0
      ? await db.select().from(questions).where(inArray(questions.id, questionIds))
      : [];

    // Preserve the original order
    const ordered = questionIds
      .map(id => sessionQuestions.find(q => q.id === id))
      .filter(Boolean);

    const shuffled = ordered.map(q => q ? shuffleMcqOptions(q) : q);
    return NextResponse.json({ session, questions: shuffled });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

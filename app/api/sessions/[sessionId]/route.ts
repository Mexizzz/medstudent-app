import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await db.query.studySessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
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

  return NextResponse.json({ session, questions: ordered });
}

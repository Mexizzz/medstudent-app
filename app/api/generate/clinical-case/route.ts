import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { generateClinicalCases } from '@/lib/ai/generators';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { sourceId, count = 5, focusTopic } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const generated = await generateClinicalCases(
      source.rawText, count, source.subject ?? 'Medicine', source.topic ?? 'General', focusTopic
    );

    const now = new Date();
    const rows = generated.map(q => ({
      id: nanoid(),
      sourceId,
      type: 'clinical_case' as const,
      subject: source.subject,
      topic: q.topic || source.topic,
      difficulty: q.difficulty || 'medium',
      caseScenario: q.caseScenario,
      examinationFindings: q.examinationFindings,
      investigations: q.investigations,
      caseQuestion: q.caseQuestion,
      caseAnswer: q.caseAnswer,
      caseRationale: q.caseRationale,
      teachingPoint: q.teachingPoint,
      createdAt: now,
    }));

    if (rows.length > 0) await db.insert(questions).values(rows);
    return NextResponse.json({ generated: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Clinical case generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { generateClinicalCases } from '@/lib/ai/generators';
import { getSourceText } from '@/lib/content/source-text';

export const maxDuration = 120;
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { checkUsageLimit, incrementUsage, getUserTier, hasFeature } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    if (!hasFeature(tier, 'clinical_case')) {
      return NextResponse.json({ error: 'Clinical Cases is available on the Max plan', upgradeRequired: true, requiredTier: 'max' }, { status: 403 });
    }

    const { allowed, used, limit } = await checkUsageLimit(userId, 'question_generate', tier);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily question generation limit reached', upgradeRequired: true, used, limit, tier }, { status: 429 });
    }

    const { sourceId, count = 5, focusTopic, pageFrom, pageTo } = await req.json();
    if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source?.rawText) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const text = await getSourceText(source, pageFrom, pageTo);

    const generated = await generateClinicalCases(
      text, count, source.subject ?? 'Medicine', source.topic ?? 'General', focusTopic
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

    if (rows.length > 0) {
      await db.insert(questions).values(rows);
      await incrementUsage(userId, 'question_generate', rows.length);
    }
    return NextResponse.json({ generated: rows.length });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Clinical case generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

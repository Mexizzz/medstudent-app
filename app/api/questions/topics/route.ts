import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { inArray, isNotNull, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET /api/questions/topics?sourceIds=a,b,c&types=mcq,flashcard
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const sourceIds = searchParams.get('sourceIds')?.split(',').filter(Boolean) ?? [];
    const types = searchParams.get('types')?.split(',').filter(Boolean) ?? [];

    if (!sourceIds.length) return NextResponse.json({ topics: [] });

    const conditions = [
      inArray(questions.sourceId, sourceIds),
      isNotNull(questions.topic),
    ];
    if (types.length) conditions.push(inArray(questions.type, types));

    const rows = await db
      .selectDistinct({ topic: questions.topic, subject: questions.subject })
      .from(questions)
      .where(and(...conditions))
      .orderBy(questions.subject, questions.topic);

    const seen = new Set<string>();
    const topics = rows
      .filter(r => r.topic && !seen.has(r.topic) && seen.add(r.topic))
      .map(r => ({ topic: r.topic!, subject: r.subject }));

    return NextResponse.json({ topics });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

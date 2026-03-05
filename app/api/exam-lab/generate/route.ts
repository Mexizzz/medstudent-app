import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import {
  GENERATE_SYSTEM, STRUCTURED_SYSTEM, TABLE_SYSTEM,
  generateUserPrompt, generateStructuredPrompt, generateTablePrompt,
  type ExamStyleAnalysis, type GeneratedLabQuestion, type QuestionMode,
} from '@/lib/exam-lab';
import { extractPdfText, savePdfFile } from '@/lib/content/pdf-extractor';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth, handleAuthError } from '@/lib/auth';

export const maxDuration = 120;

// Each MCQ (question + 4 options + explanation) ~ 200-300 tokens.
// Keep each batch <= 20 so we stay well within 8192 max_tokens.
const BATCH_SIZE = 20;

async function callGroqGenerateBatch(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
  mode: QuestionMode,
): Promise<GeneratedLabQuestion[]> {
  const isStructured = mode === 'structured';
  const isTable = mode === 'table';
  const systemPrompt = isStructured ? STRUCTURED_SYSTEM : isTable ? TABLE_SYSTEM : GENERATE_SYSTEM;
  const userPrompt = isStructured
    ? generateStructuredPrompt(styleAnalysis, material, count, subject)
    : isTable
      ? generateTablePrompt(styleAnalysis, material, count, subject)
      : generateUserPrompt(styleAnalysis, material, count, subject, mode);

  for (const model of [MODEL, FALLBACK_MODEL]) {
    try {
      const res = await groq.chat.completions.create({
        model,
        temperature: 0.5,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const data = JSON.parse(res.choices[0]?.message?.content ?? '{}') as { questions?: GeneratedLabQuestion[] };
      return data.questions ?? [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429') || msg.includes('rate limit')) continue;
      throw e;
    }
  }
  throw new Error('All models rate-limited. Try again shortly.');
}

async function callGroqGenerate(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
  mode: QuestionMode,
): Promise<GeneratedLabQuestion[]> {
  if (count <= BATCH_SIZE) {
    return callGroqGenerateBatch(styleAnalysis, material, count, subject, mode);
  }

  // Split into batches of BATCH_SIZE and run in parallel
  const batches: number[] = [];
  let remaining = count;
  while (remaining > 0) {
    batches.push(Math.min(remaining, BATCH_SIZE));
    remaining -= BATCH_SIZE;
  }

  const batchResults = await Promise.all(
    batches.map(batchCount => callGroqGenerateBatch(styleAnalysis, material, batchCount, subject, mode))
  );
  return batchResults.flat();
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const formData = await req.formData();
    const profileId = formData.get('profileId') as string | null;
    const count = parseInt((formData.get('count') as string | null) ?? '20', 10);
    const subject = (formData.get('subject') as string | null) ?? '';
    const rawMode = (formData.get('mode') as string | null) ?? 'mcq';
    const mode: QuestionMode = (['mcq', 'written', 'structured', 'table', 'mixed'].includes(rawMode) ? rawMode : 'mcq') as QuestionMode;

    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

    const [profileRow] = await db.select().from(examProfiles).where(and(eq(examProfiles.id, profileId), eq(examProfiles.userId, userId)));
    if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const styleAnalysis = JSON.parse(profileRow.styleAnalysis) as ExamStyleAnalysis;

    // Get material text — from file or text field
    let material = (formData.get('text') as string | null) ?? '';
    const file = formData.get('file') as File | null;
    if (file && file.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = await savePdfFile(await file.arrayBuffer(), uploadsDir);
      try {
        const extracted = await extractPdfText(filePath);
        material = extracted.text;
      } finally {
        await fs.unlink(filePath).catch(() => {});
      }
    }

    if (!material.trim()) {
      return NextResponse.json({ error: 'No study material provided' }, { status: 400 });
    }

    // Truncate material to 8000 chars
    const truncated = material.slice(0, 8000);

    const questions = await callGroqGenerate(styleAnalysis, truncated, count, subject, mode);

    return NextResponse.json({ questions });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Exam generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

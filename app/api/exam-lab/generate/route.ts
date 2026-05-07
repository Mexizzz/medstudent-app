import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  GENERATE_SYSTEM, STRUCTURED_SYSTEM, TABLE_SYSTEM,
  generateUserPrompt, generateStructuredPrompt, generateTablePrompt,
  type ExamStyleAnalysis, type GeneratedLabQuestion, type QuestionMode,
} from '@/lib/exam-lab';
import { extractPdfText, savePdfFile } from '@/lib/content/pdf-extractor';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { checkUsageLimit, incrementUsage, getUserTier, hasFeature } from '@/lib/subscription';
import { callLLMJSON, mapGeneratorError } from '@/lib/ai/generators';
export const dynamic = 'force-dynamic';

export const maxDuration = 120;

// Each MCQ (question + 4 options + explanation) ~ 200-300 tokens.
// Keep each batch small so a single response stays under the per-request TPM
// allowance even on the Gemini fallback path.
const BATCH_SIZE = 12;

async function callLLMGenerateBatch(
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

  const data = await callLLMJSON<{ questions?: GeneratedLabQuestion[] }>(
    systemPrompt,
    userPrompt,
    4096,
  );
  return data.questions ?? [];
}

async function callLLMGenerate(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
  mode: QuestionMode,
): Promise<GeneratedLabQuestion[]> {
  if (count <= BATCH_SIZE) {
    return callLLMGenerateBatch(styleAnalysis, material, count, subject, mode);
  }

  // Split into batches and run sequentially. Parallel batches multiply TPM
  // pressure and trigger rate limits on free tiers — sequential is slower
  // but reliable.
  const batches: number[] = [];
  let remaining = count;
  while (remaining > 0) {
    batches.push(Math.min(remaining, BATCH_SIZE));
    remaining -= BATCH_SIZE;
  }

  const out: GeneratedLabQuestion[] = [];
  for (const batchCount of batches) {
    const part = await callLLMGenerateBatch(styleAnalysis, material, batchCount, subject, mode);
    out.push(...part);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    if (!hasFeature(tier, 'exam_lab')) {
      return NextResponse.json({ error: 'Exam Lab is available on the Max plan', upgradeRequired: true, requiredTier: 'max' }, { status: 403 });
    }

    const { allowed, used, limit } = await checkUsageLimit(userId, 'exam_generate', tier);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily exam generation limit reached', upgradeRequired: true, used, limit, tier }, { status: 429 });
    }

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

    const questions = await callLLMGenerate(styleAnalysis, truncated, count, subject, mode);
    await incrementUsage(userId, 'exam_generate');

    return NextResponse.json({ questions });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    const mapped = mapGeneratorError(error);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    console.error('Exam generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import { ANALYZE_SYSTEM, analyzeUserPrompt, type ExamStyleAnalysis } from '@/lib/exam-lab';
import { extractPdfText, savePdfFile } from '@/lib/content/pdf-extractor';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth, handleAuthError } from '@/lib/auth';

export const maxDuration = 120;

async function callGroqAnalyze(text: string): Promise<ExamStyleAnalysis> {
  const prompt = analyzeUserPrompt(text);
  for (const model of [MODEL, FALLBACK_MODEL]) {
    try {
      const res = await groq.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM },
          { role: 'user', content: prompt },
        ],
      });
      return JSON.parse(res.choices[0]?.message?.content ?? '{}') as ExamStyleAnalysis;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429') || msg.includes('rate limit')) continue;
      throw e;
    }
  }
  throw new Error('All models rate-limited. Try again shortly.');
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const formData = await req.formData();
    const name = (formData.get('name') as string | null)?.trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let rawText = (formData.get('text') as string | null) ?? '';

    // Handle PDF file upload
    const file = formData.get('file') as File | null;
    if (file && file.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = await savePdfFile(await file.arrayBuffer(), uploadsDir);
      try {
        const extracted = await extractPdfText(filePath);
        rawText = extracted.text;
      } finally {
        await fs.unlink(filePath).catch(() => {});
      }
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'No exam content provided' }, { status: 400 });
    }

    // Truncate to 6000 chars for analysis
    const textForAnalysis = rawText.slice(0, 6000);

    const styleAnalysis = await callGroqAnalyze(textForAnalysis);

    const profile = {
      id: nanoid(),
      userId,
      name,
      styleAnalysis: JSON.stringify(styleAnalysis),
      rawTextSnippet: rawText.slice(0, 500),
      questionCount: styleAnalysis.totalDetected ?? 0,
      createdAt: new Date(),
    };

    await db.insert(examProfiles).values(profile);

    return NextResponse.json({
      profile: { ...profile, styleAnalysis },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Exam analyze error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

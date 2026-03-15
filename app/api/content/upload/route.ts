import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { db } from '@/db';
import { contentSources } from '@/db/schema';
import { savePdfFile, extractPdfText } from '@/lib/content/pdf-extractor';
import { nanoid } from 'nanoid';
import path from 'path';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, STATIC_LIMITS } from '@/lib/subscription';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    const limits = STATIC_LIMITS[tier];
    const existing = await db.query.contentSources.findMany({ where: eq(contentSources.userId, userId), columns: { id: true } });
    if (existing.length >= limits.maxContentSources) {
      return NextResponse.json({ error: `Upload limit reached (${limits.maxContentSources} sources on ${tier} plan)`, upgradeRequired: true, tier }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const topic = formData.get('topic') as string;
    const type = (formData.get('type') as string) || 'pdf'; // 'pdf' | 'mcq_pdf'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const dataDir = process.env.DATA_DIR || process.cwd();
    const uploadsDir = path.join(dataDir, 'uploads');
    const buffer = await file.arrayBuffer();
    const filePath = await savePdfFile(buffer, uploadsDir);

    const { text, wordCount, pageCount } = await extractPdfText(filePath);

    const id = nanoid();
    const now = new Date();

    await db.insert(contentSources).values({
      id,
      userId,
      type,
      title,
      subject: subject || null,
      topic: topic || null,
      filePath,
      rawText: text,
      wordCount,
      pageCount,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id, title, wordCount, pageCount });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

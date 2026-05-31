import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 120;
import { db } from '@/db';
import { contentSources } from '@/db/schema';
import { savePdfFile, extractPdfText } from '@/lib/content/pdf-extractor';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, STATIC_LIMITS } from '@/lib/subscription';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// Must stay in sync with next.config.ts experimental.serverActions.bodySizeLimit.
const MAX_FILE_BYTES = 30 * 1024 * 1024; // 30MB
const MIN_WORDS_FOR_GENERATION = 30;      // below this the AI has nothing useful to chew on

export async function POST(req: NextRequest) {
  let savedFilePath: string | null = null;
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    const limits = STATIC_LIMITS[tier];
    const existing = await db.query.contentSources.findMany({
      where: eq(contentSources.userId, userId),
      columns: { id: true },
    });
    if (existing.length >= limits.maxContentSources) {
      return NextResponse.json(
        { error: `Upload limit reached (${limits.maxContentSources} sources on ${tier} plan)`, upgradeRequired: true, tier },
        { status: 429 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Most common: the request body exceeded the server's body-size limit
      // (Next config + reverse-proxy). Surface that explicitly.
      if (msg.toLowerCase().includes('body') && (msg.includes('limit') || msg.includes('size'))) {
        return NextResponse.json(
          { error: `PDF is too large. Max upload size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.` },
          { status: 413 },
        );
      }
      return NextResponse.json({ error: 'Could not read upload. Please try again.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim() ?? '';
    const subject = (formData.get('subject') as string | null)?.trim() || null;
    const topic = (formData.get('topic') as string | null)?.trim() || null;
    const type = ((formData.get('type') as string | null) || 'pdf').trim();

    // ── Validation ────────────────────────────────────────────────────────
    if (!file) return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    if (!['pdf', 'mcq_pdf'].includes(type)) {
      return NextResponse.json({ error: 'Invalid file type selection.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'The file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `PDF is ${mb}MB. Max is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB — try compressing or splitting it.` },
        { status: 413 },
      );
    }

    const lowerName = (file.name || '').toLowerCase();
    if (!lowerName.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted on this tab. Use the Notes tab to paste plain text.' },
        { status: 400 },
      );
    }

    // Verify the file is actually a PDF (magic bytes %PDF-), not just named .pdf
    const buffer = await file.arrayBuffer();
    const head = new Uint8Array(buffer.slice(0, 5));
    const isPdfMagic =
      head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
    if (!isPdfMagic) {
      return NextResponse.json(
        { error: "That doesn't look like a valid PDF file. Make sure the file isn't corrupted." },
        { status: 400 },
      );
    }

    // ── Persist file ──────────────────────────────────────────────────────
    const dataDir = process.env.DATA_DIR || process.cwd();
    const uploadsDir = path.join(dataDir, 'uploads');

    try {
      savedFilePath = await savePdfFile(buffer, uploadsDir);
    } catch (e) {
      console.error('savePdfFile failed:', e);
      return NextResponse.json({ error: 'Could not save the file. Please try again.' }, { status: 500 });
    }

    // ── Extract text ──────────────────────────────────────────────────────
    let extraction;
    try {
      extraction = await extractPdfText(savedFilePath);
    } catch (e) {
      console.error('extractPdfText failed:', e);
      await fs.unlink(savedFilePath).catch(() => {});
      savedFilePath = null;
      return NextResponse.json(
        { error: 'Could not read the PDF. It might be password-protected, encrypted, or corrupted.' },
        { status: 422 },
      );
    }

    const { text, wordCount, pageCount } = extraction;

    if (wordCount < MIN_WORDS_FOR_GENERATION) {
      await fs.unlink(savedFilePath).catch(() => {});
      savedFilePath = null;
      return NextResponse.json(
        {
          error: wordCount === 0
            ? 'This PDF has no extractable text — it looks like a scanned image. Try a PDF with selectable text, or paste your notes into the Notes tab.'
            : `Only ${wordCount} words were extracted — too short for the AI to generate questions. Try a longer source.`,
        },
        { status: 422 },
      );
    }

    // ── Save row ──────────────────────────────────────────────────────────
    const id = nanoid();
    const now = new Date();

    try {
      await db.insert(contentSources).values({
        id,
        userId,
        type,
        title,
        subject,
        topic,
        filePath: savedFilePath,
        rawText: text,
        wordCount,
        pageCount,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      console.error('DB insert failed, removing saved file:', e);
      await fs.unlink(savedFilePath).catch(() => {});
      savedFilePath = null;
      return NextResponse.json({ error: 'Could not save the source. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ id, title, wordCount, pageCount });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;

    // Cleanup orphan file if we crashed mid-flow
    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => {});
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

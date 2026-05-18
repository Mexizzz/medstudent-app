import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources } from '@/db/schema';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, STATIC_LIMITS } from '@/lib/subscription';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

const MIN_WORDS = 50;
const MAX_CHARS = 200_000;

export async function POST(req: NextRequest) {
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
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null) as
      | { title?: string; text?: string; subject?: string; topic?: string }
      | null;
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const title = (body.title ?? '').trim();
    const text = (body.text ?? '').trim();
    const subject = (body.subject ?? '').trim() || null;
    const topic = (body.topic ?? '').trim() || null;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Paste your notes in the text box' }, { status: 400 });
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Text is too long (${text.length.toLocaleString()} chars). Max ${MAX_CHARS.toLocaleString()}. Split it into multiple sources.` },
        { status: 400 }
      );
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORDS) {
      return NextResponse.json(
        { error: `Notes are too short (${wordCount} words). Need at least ${MIN_WORDS} so the AI has something to work with.` },
        { status: 400 }
      );
    }

    const id = nanoid();
    const now = new Date();

    await db.insert(contentSources).values({
      id,
      userId,
      type: 'text',
      title,
      subject,
      topic,
      rawText: text,
      wordCount,
      pageCount: null,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id, title, wordCount });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Text content error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db, sqlite } from '@/db';
import { contentSources, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthError } from '@/lib/auth';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Msg = { role: 'user' | 'assistant' | 'system'; content: string; ts: number };

function getRow(sourceId: string, userId: string) {
  return sqlite.prepare(
    'SELECT id, content, messages, version, created_at, updated_at FROM source_summaries WHERE source_id = ? AND user_id = ?'
  ).get(sourceId, userId) as any;
}

export async function GET(_req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { sourceId } = await params;

    const source = await db.query.contentSources.findFirst({
      where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
    });
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const row = getRow(sourceId, userId);
    return NextResponse.json({
      source: { id: source.id, title: source.title, subject: source.subject, topic: source.topic, wordCount: source.wordCount },
      summary: row ? {
        content: row.content,
        messages: JSON.parse(row.messages || '[]') as Msg[],
        version: row.version,
        updatedAt: row.updated_at,
      } : null,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { sourceId } = await params;

    const userRow = await db.select({ tier: users.subscriptionTier }).from(users).where(eq(users.id, userId)).get();
    if (!userRow || userRow.tier === 'free') {
      return NextResponse.json({ error: 'AI summaries are a Pro feature. Upgrade to unlock.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const refinement: string = (body.refinement || '').toString().slice(0, 1000);

    const source = await db
      .select({ rawText: contentSources.rawText, title: contentSources.title, subject: contentSources.subject })
      .from(contentSources)
      .where(and(eq(contentSources.id, sourceId), eq(contentSources.userId, userId)))
      .get();
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    if (!source.rawText) return NextResponse.json({ error: 'No text content available for this source.' }, { status: 400 });

    const text = source.rawText.slice(0, 32000);
    const existing = getRow(sourceId, userId);
    const messages: Msg[] = existing ? JSON.parse(existing.messages || '[]') : [];
    const prevContent: string = existing?.content || '';

    const systemPrompt = `You are a medical education expert creating a structured study summary for a medical student.

Produce a comprehensive summary in markdown with:
- **# Title** at the top (use the content title)
- **## Section headings** for major topics
- **### Subsections** where helpful
- **Bold** for key terms, drug names, diagnoses, and critical facts
- Bullet points for lists
- A final "## Key Takeaways" section with 5-8 high-yield exam points
- A final "## Clinical Pearls" section with practical pearls when relevant

Be thorough but concise. Write for a USMLE / board-exam context. Use precise medical terminology. Do NOT include meta commentary — output ONLY the summary markdown.`;

    let userTurn: string;
    if (refinement && prevContent) {
      userTurn = `Here is the current summary you produced:

---
${prevContent}
---

The student has asked for this refinement:
"${refinement}"

Rewrite the FULL summary incorporating this request. Keep everything that was already good. Expand, add, or fix only what the refinement asks for. Output ONLY the updated markdown summary.

(Original source material for reference:)
${text}`;
      messages.push({ role: 'user', content: refinement, ts: Date.now() });
    } else {
      userTurn = `Generate a detailed study summary of this ${source.subject ?? 'medical'} content titled "${source.title}":

${text}`;
    }

    async function makeStream(model: string) {
      return groq.chat.completions.create({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userTurn },
        ],
      });
    }

    let stream;
    try { stream = await makeStream(MODEL); }
    catch { stream = await makeStream(FALLBACK_MODEL); }

    const encoder = new TextEncoder();
    let fullText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content ?? '';
            if (t) {
              fullText += t;
              controller.enqueue(encoder.encode(t));
            }
          }
        } catch (err) {
          controller.error(err);
          return;
        }

        messages.push({ role: 'assistant', content: fullText, ts: Date.now() });
        const now = Date.now();
        if (existing) {
          sqlite.prepare(
            'UPDATE source_summaries SET content = ?, messages = ?, version = version + 1, updated_at = ? WHERE id = ?'
          ).run(fullText, JSON.stringify(messages), now, existing.id);
        } else {
          sqlite.prepare(
            'INSERT INTO source_summaries (id, source_id, user_id, content, messages, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
          ).run(nanoid(), sourceId, userId, fullText, JSON.stringify(messages), now, now);
        }

        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Summary generate error:', e);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { sourceId } = await params;
    sqlite.prepare('DELETE FROM source_summaries WHERE source_id = ? AND user_id = ?').run(sourceId, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

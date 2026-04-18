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

    const systemPrompt = `You are an expert medical educator creating a comprehensive, exam-ready study summary for a medical student preparing for USMLE / board exams.

Your output has TWO parts separated by the literal line "---SUMMARY---":

PART 1 — ACK (before the separator):
Write a 1-2 sentence reply in natural language acknowledging what the student asked for and what you're about to include. If this is the first generation (no refinement), briefly describe the major sections you'll cover. Speak directly to the student ("I've included…", "I added…"). Keep it short and human.

PART 2 — SUMMARY (after the separator):
A comprehensive markdown summary. MANDATORY COVERAGE — include every applicable category for the content:

For ANATOMY / HISTOLOGY / EMBRYOLOGY content:
- Gross structure and relationships
- Cell types, tissue layers, subcellular structures (cilia, microvilli, desmosomes, tight junctions, basement membrane, etc. — name them explicitly when present)
- Embryological origin and developmental milestones
- Blood supply, innervation, lymphatic drainage (when relevant)

For PHYSIOLOGY / BIOCHEMISTRY:
- Mechanism (step-by-step)
- Regulation (hormonal, neural, feedback loops)
- Key enzymes, cofactors, rate-limiting steps
- Associated lab values / normal ranges

For PATHOLOGY:
- Etiology and risk factors
- Pathogenesis (molecular → cellular → tissue → organ)
- Gross & microscopic findings
- Complications

For PHARMACOLOGY:
- Mechanism of action
- Indications, contraindications
- Dosing pearls (when in source)
- Major side effects and toxicities
- Drug-drug interactions

For CLINICAL content:
- Epidemiology / demographics
- Presenting signs & symptoms
- Diagnostic workup (labs, imaging, criteria)
- Differential diagnosis
- Management / treatment algorithm
- Prognosis, screening, prevention

STRUCTURE:
- # Title at top (use the content title)
- ## Major sections for each applicable category above
- ### Subsections for depth
- **Bold** every key term, drug name, diagnosis, lab value, threshold, and high-yield fact
- Bullet points for lists of findings / DDx / steps
- Tables (markdown) when comparing entities
- ## Key Takeaways — 8-12 bullet-point high-yield exam facts
- ## Clinical Pearls — practical pearls, mnemonics, buzzwords

Use precise terminology. Do NOT invent facts not supported by the source — but DO include standard medical context the source implies (e.g., if it mentions cilia, include their function and clinical associations like Kartagener's). Aim for thoroughness: better to include too much than miss something the student needs.

Do not output meta commentary inside PART 2 — just the summary markdown.`;

    let userTurn: string;
    if (refinement && prevContent) {
      userTurn = `This is the current summary:

--- CURRENT SUMMARY START ---
${prevContent}
--- CURRENT SUMMARY END ---

The student has asked for this refinement / addition:
"${refinement}"

Interpret the request carefully. Examples:
- "u missed cilia" → add a full section on cilia (structure, function, clinical associations)
- "include drug dosages" → add doses wherever drugs are mentioned
- "more on path" → expand the pathology/pathophysiology section substantially
- "make it more" → expand ALL sections with more detail and coverage
- "add X" → explicitly add X as a new section or subsection

Then output your response in two parts separated by "---SUMMARY---":

PART 1: Briefly tell the student what you're adding or changing (1-2 sentences, natural voice).
PART 2: The FULL updated markdown summary. Keep every correct thing that was already there. Add/expand only what the refinement requests, plus any related high-yield content that belongs with it. Do not shrink or lose prior content.

Original source material (use for reference, don't copy verbatim):
${text}`;
      messages.push({ role: 'user', content: refinement, ts: Date.now() });
    } else {
      userTurn = `Generate a thorough, exam-ready study summary of this ${source.subject ?? 'medical'} content titled "${source.title}".

Cover every applicable category from your instructions (anatomy, histology, physiology, pathology, pharmacology, clinical presentation, diagnosis, treatment — whichever apply). Be comprehensive; do not skip subcellular structures, regulatory mechanisms, or clinical correlates when the source mentions them.

Remember: output PART 1 (short acknowledgement of sections covered) then "---SUMMARY---" then PART 2 (the full markdown summary).

Source content:
${text}`;
    }

    async function makeStream(model: string) {
      return groq.chat.completions.create({
        model,
        stream: true,
        temperature: 0.5,
        max_tokens: 6000,
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

        // Split ACK (chat reply) from SUMMARY (markdown document) on the separator
        const sepIdx = fullText.indexOf('---SUMMARY---');
        let ack: string;
        let summaryBody: string;
        if (sepIdx >= 0) {
          ack = fullText.slice(0, sepIdx).trim();
          summaryBody = fullText.slice(sepIdx + '---SUMMARY---'.length).trim();
        } else {
          // Fallback: no separator produced — treat whole response as summary
          ack = refinement
            ? "I've updated the summary with what you asked for."
            : "I've built a comprehensive summary covering the major sections of this material.";
          summaryBody = fullText.trim();
        }
        if (!summaryBody) summaryBody = prevContent;

        messages.push({ role: 'assistant', content: ack, ts: Date.now() });
        const now = Date.now();
        if (existing) {
          sqlite.prepare(
            'UPDATE source_summaries SET content = ?, messages = ?, version = version + 1, updated_at = ? WHERE id = ?'
          ).run(summaryBody, JSON.stringify(messages), now, existing.id);
        } else {
          sqlite.prepare(
            'INSERT INTO source_summaries (id, source_id, user_id, content, messages, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
          ).run(nanoid(), sourceId, userId, summaryBody, JSON.stringify(messages), now, now);
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

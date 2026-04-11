import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { groq, MODEL } from '@/lib/ai/client';

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { sourceId } = await params;

    // Pro check
    const userRow = await db.select({ tier: users.subscriptionTier }).from(users).where(eq(users.id, userId)).get();
    if (!userRow || userRow.tier === 'free') {
      return NextResponse.json({ error: 'AI summaries are a Pro feature. Upgrade to unlock.' }, { status: 403 });
    }

    const source = await db
      .select({ rawText: contentSources.rawText, title: contentSources.title, subject: contentSources.subject })
      .from(contentSources)
      .where(and(eq(contentSources.id, sourceId), eq(contentSources.userId, userId)))
      .get();

    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    if (!source.rawText) return NextResponse.json({ error: 'No text content available for this source.' }, { status: 400 });

    // Truncate to ~8000 words to stay within token limits
    const text = source.rawText.slice(0, 32000);

    const stream = await groq.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a medical education expert. Generate a comprehensive, well-structured study summary. Use markdown with:
- **## headings** for main sections
- **Bold** for key terms and concepts
- Bullet points for lists
- A "Key Takeaways" section at the end
Be concise but thorough. Write for medical students preparing for exams.`,
        },
        {
          role: 'user',
          content: `Generate a detailed study summary of this ${source.subject ?? 'medical'} content titled "${source.title}":\n\n${text}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (e: any) {
    if (e?.status === 401 || e?.message?.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Summarize error:', e);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

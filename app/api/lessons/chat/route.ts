import { NextRequest } from 'next/server';
import { groq } from '@/lib/ai/client';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const CHAT_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { messages, currentLesson } = await req.json();

    const lessonContext = currentLesson
      ? `CURRENT LESSON:
Title: ${currentLesson.title}
Topic: ${currentLesson.topic}
Overview: ${currentLesson.overview}
Sections:
${currentLesson.sections
  .map((s: { heading: string; explanation: string; keyPoints: string[] }, i: number) =>
    `  [${i}] ${s.heading}: ${s.explanation}`
  )
  .join('\n')}`
      : 'No lesson loaded.';

    const systemPrompt = `You are an AI medical teacher helping a student understand a lesson they are viewing.

${lessonContext}

YOUR ONLY TWO RESPONSE MODES:

MODE 1 — TEXT ANSWER (for factual questions):
Just answer in 2-3 sentences. No markers.

MODE 2 — DIAGRAM UPDATE (use this when the student asks to SEE, SHOW, DISPLAY, or wants a diagram/image/picture/visual):
You MUST output the update block immediately. Do NOT say "I will update" — just DO it.
Write one sentence describing what you are showing, then on the VERY NEXT LINE output the block:

<<<UPDATE_SECTION>>>
{"sectionIndex": 0, "wikiSearch": "SEARCH TERM HERE"}
<<<END_UPDATE>>>

RULES FOR MODE 2:
- Use sectionIndex 0 unless the student mentions a specific section
- wikiSearch must be a SHORT specific medical term (2-5 words), e.g. "cell membrane transport", "phospholipid bilayer", "sodium potassium pump", "osmosis diagram"
- ALWAYS include the <<<UPDATE_SECTION>>> and <<<END_UPDATE>>> markers — never skip them
- Do NOT promise to show something without outputting the markers

TRIGGER WORDS THAT REQUIRE MODE 2 (always use the update block):
show, show me, display, diagram, image, picture, visual, better diagram, illustrate, draw, demonstrate

Always be medically accurate.`;

    const groqMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        temperature: 0.5,
        max_tokens: 1500,
        stream: true,
        messages: groqMessages,
      });
    } catch {
      console.warn('70b model failed, falling back to 8b');
      completion = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        temperature: 0.5,
        max_tokens: 1500,
        stream: true,
        messages: groqMessages,
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Lesson chat error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

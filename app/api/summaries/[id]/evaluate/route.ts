import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summaries } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import { requireAuth, handleAuthError } from '@/lib/auth';

export const maxDuration = 120;

const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    const { topic, textContent, canvasData } = await req.json();

    // ── Step 1: Transcribe handwriting from canvas ─────────────────────────────
    let transcription = textContent?.trim() || '';

    if (canvasData) {
      for (const visionModel of VISION_MODELS) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const visionMessages: any[] = [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: canvasData } },
                { type: 'text', text: 'Transcribe all handwritten text visible in this image. Return only the transcribed text exactly as written, nothing else.' },
              ],
            },
          ];

          const visionRes = await groq.chat.completions.create({
            model: visionModel,
            temperature: 0,
            max_tokens: 2048,
            messages: visionMessages,
          });

          const visionText = visionRes.choices[0]?.message?.content?.trim() ?? '';
          if (visionText) { transcription = visionText; break; }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Vision model ${visionModel} failed:`, msg);
          // try next vision model
        }
      }
    }

    if (!transcription) {
      return NextResponse.json({ error: 'Could not read any content from the canvas. Make sure you have saved the summary first, then try evaluating.' }, { status: 400 });
    }

    // ── Step 2: Evaluate the transcribed content ───────────────────────────────
    const systemPrompt = `You are a strict medical/biology examiner grading a student's written summary as if it were a real exam answer.

GRADING RULES — apply these rigorously:
- COVERAGE: Award marks ONLY for key facts that are explicitly stated. Each missing key point deducts marks. A correct but incomplete answer cannot score above 50% for coverage.
- ACCURACY: Deduct marks for any incorrect, vague, or imprecise statements. Scientific precision is required.
- ORGANIZATION: Deduct marks for poor structure, missing labels, or unclear presentation.
- OVERALL SCORE: Reflect the real exam mark honestly. A one-sentence definition of a complex topic should score 20–40%. A partial answer scores 40–60%. Only a complete, precise, well-structured answer scores above 80%.
- Do NOT give benefit of the doubt. Do NOT round up. Grade what is written, not what the student might have meant.
- List EVERY important missing key point explicitly in the improvements array.
Return ONLY valid JSON — no extra text.`;

    const userPrompt = `Topic/Lesson: ${topic?.trim() || 'Medical topic'}

Student's written summary:
${transcription}

Grade this as a strict medical examiner. Consider what a complete exam answer must include for this topic — structure, function, composition, mechanisms, etc. Any missing essential point is a deduction.

Return this exact JSON:
{
  "score": 35,
  "grade": "Needs Work",
  "coverage": { "score": 30, "comment": "List exactly which key points were present and which essential points are completely missing" },
  "accuracy": { "score": 80, "comment": "Are the facts stated scientifically correct and precise?" },
  "organization": { "score": 50, "comment": "Is the answer clearly structured and labeled?" },
  "strengths": ["only list what was actually written correctly"],
  "improvements": ["specific missing key point 1", "specific missing key point 2", "specific missing key point 3"],
  "overallFeedback": "Honest 2-3 sentence assessment of what is missing and what score this would receive in a real exam",
  "idealAnswer": "A concise exam answer — 1 to 3 sentences maximum — that contains exactly the key points needed for full marks. No extra explanation, no elaboration beyond what the exam requires.",
  "writingTips": {
    "steps": [
      { "label": "What it is", "example": "e.g. A thin, living, flexible membrane" },
      { "label": "Where it is", "example": "e.g. Surrounds the cytoplasm of the cell" },
      { "label": "What it is made of", "example": "e.g. Phospholipid bilayer with embedded proteins" },
      { "label": "What it does", "example": "e.g. Selectively permeable — controls movement of substances" }
    ],
    "memoryTrick": "W–W–M–F (What · Where · Made of · Function)"
  }
}

grade must be exactly one of: "Excellent" (score>=85), "Good" (65-84), "Needs Work" (40-64), "Insufficient" (<40)
All score fields must be integers 0-100.
idealAnswer must be SHORT (1-3 sentences), exam-style, containing only the essential mark-scoring points — not an essay.
writingTips.steps must contain 3–5 steps tailored specifically to this topic (not generic). Each step has a "label" (the thing to include) and "example" (a one-line example for THIS topic).
writingTips.memoryTrick is the first-letter acronym of the step labels, e.g. "W–W–M–F".`;

    for (const model of [MODEL, FALLBACK_MODEL]) {
      try {
        const res = await groq.chat.completions.create({
          model,
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
        });

        const data = JSON.parse(res.choices[0]?.message?.content ?? '{}');
        data.transcription = transcription;

        await db.update(summaries)
          .set({ aiScore: data.score, aiFeedback: JSON.stringify(data), updatedAt: new Date() })
          .where(and(eq(summaries.id, id), eq(summaries.userId, userId)));

        return NextResponse.json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('429') || msg.includes('rate limit')) continue;
        throw e;
      }
    }

    return NextResponse.json({ error: 'AI unavailable, try again shortly.' }, { status: 503 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

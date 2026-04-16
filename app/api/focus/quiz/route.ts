import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { topic } = await req.json();
    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const prompt = `You are a medical education AI. Generate ONE multiple-choice question (MCQ) about the following medical study topic: "${topic.slice(0, 300)}".

Rules:
- The question must be clinically relevant and appropriate for a medical student
- Create exactly 4 options (A, B, C, D)
- Only one option is correct
- Keep the question concise (under 60 words)
- Keep each option under 20 words
- Include a brief explanation (1-2 sentences) for the correct answer

Respond ONLY with valid JSON in this exact format:
{
  "question": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A",
  "explanation": "..."
}`;

    async function callGroq(model: string) {
      const res = await groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 400,
      });
      return res.choices[0]?.message?.content ?? null;
    }

    let raw: string | null = null;
    try { raw = await callGroq(MODEL); }
    catch { raw = await callGroq(FALLBACK_MODEL); }

    if (!raw) throw new Error('No response from AI');

    const parsed = JSON.parse(raw);
    if (!parsed.question || !parsed.options || !parsed.correct) {
      throw new Error('Invalid AI response format');
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
  }
}

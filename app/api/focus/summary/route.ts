import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL, FALLBACK_MODEL } from '@/lib/ai/client';
import { sqlite } from '@/db';
import { requireAuth, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const s = sqlite.prepare(
      'SELECT topic, subject, total_seconds, correct_quizzes, total_quizzes, notes, user_id FROM focus_sessions WHERE id = ?'
    ).get(sessionId) as any;
    if (!s || s.user_id !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const topic = (s.topic || '').slice(0, 1000);
    const notes = (s.notes || '').slice(0, 2000);
    const minutes = Math.round((s.total_seconds || 0) / 60);

    const prompt = `You are a medical study coach. Write a short 3-bullet summary of what a medical student just studied.

Topic they set: "${topic || 'unspecified'}"
Time: ${minutes} minutes
Quiz performance: ${s.correct_quizzes || 0}/${s.total_quizzes || 0}
${notes ? `Notes they took:\n${notes}` : ''}

Respond ONLY with JSON in this format:
{ "bullets": ["bullet 1", "bullet 2", "bullet 3"], "nextUp": "1 sentence suggestion for what to study next" }

Keep each bullet under 18 words. Be specific to the topic, not generic.`;

    async function call(model: string) {
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
    try { raw = await call(MODEL); }
    catch { raw = await call(FALLBACK_MODEL); }
    if (!raw) throw new Error('no response');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.bullets)) throw new Error('bad format');

    sqlite.prepare('UPDATE focus_sessions SET summary = ? WHERE id = ?').run(JSON.stringify(parsed), sessionId);

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

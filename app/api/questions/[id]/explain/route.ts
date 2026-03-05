import { NextRequest } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { groq } from '@/lib/ai/client';

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [q] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!q) {
    return new Response(JSON.stringify({ error: 'Question not found' }), { status: 404 });
  }

  // Build question context
  let questionText = '';
  let optionsText = '';
  let correctText = '';

  if (q.type === 'mcq') {
    questionText = q.question ?? '';
    optionsText = [
      q.optionA ? `A) ${q.optionA}` : '',
      q.optionB ? `B) ${q.optionB}` : '',
      q.optionC ? `C) ${q.optionC}` : '',
      q.optionD ? `D) ${q.optionD}` : '',
    ].filter(Boolean).join('\n');
    const correctLetter = q.correctAnswer ?? '';
    const correctOption = correctLetter === 'A' ? q.optionA : correctLetter === 'B' ? q.optionB : correctLetter === 'C' ? q.optionC : q.optionD;
    correctText = `${correctLetter}) ${correctOption}`;
  } else if (q.type === 'clinical_case') {
    questionText = `${q.caseScenario ?? ''}\n${q.caseQuestion ?? ''}`;
    correctText = q.caseAnswer ?? '';
  } else if (q.type === 'flashcard') {
    questionText = q.front ?? '';
    correctText = q.back ?? '';
  } else {
    questionText = q.question ?? q.blankText ?? '';
    correctText = q.correctAnswer ?? q.blankAnswer ?? q.modelAnswer ?? '';
  }

  const systemPrompt = `You are a senior medical professor giving a student a deep, memorable explanation. Be concise but complete. Use markdown headers exactly as shown.`;

  const userPrompt = `Question: ${questionText}
${optionsText ? `\nOptions:\n${optionsText}` : ''}
Correct answer: ${correctText}
${q.explanation ? `\nBasic explanation: ${q.explanation}` : ''}

Give a professor-level explanation using EXACTLY this format:

## Mechanism
[2-3 sentences explaining the underlying mechanism/pathophysiology]

## Why Each Option Is Wrong
${q.type === 'mcq' ? '[For each wrong option A/B/C/D, explain specifically why it is incorrect]' : '[Explain common misconceptions]'}

## Clinical Pearl
[1-2 sentences of high-yield clinical relevance]

## Memory Trick
[A mnemonic, analogy, or memorable pattern to never forget this]`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 800,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

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
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

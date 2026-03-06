import { NextRequest } from 'next/server';
import { db } from '@/db';
import { topicPerformance, sessionResponses, questions, contentSources } from '@/db/schema';
import { groq } from '@/lib/ai/client';
import { sql, eq, and, inArray } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// Use a fast model with a higher daily token limit for interactive chat
const TUTOR_MODEL = 'llama-3.1-8b-instant';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { messages } = await req.json();

    // ── Gather student context from DB ────────────────────────────────────────

    // Weak topics sorted by lowest score
    const weakTopics = await db
      .select()
      .from(topicPerformance)
      .where(sql`${topicPerformance.userId} = ${userId} AND ${topicPerformance.totalAttempts} >= 1`)
      .orderBy(sql`${topicPerformance.avgScore} asc`)
      .limit(6);

    // Most frequently wrong questions
    const wrongRows = await db
      .select({
        questionText: questions.question,
        front:        questions.front,
        blankText:    questions.blankText,
        caseQuestion: questions.caseQuestion,
        correctAnswer:questions.correctAnswer,
        explanation:  questions.explanation,
        topic:        questions.topic,
        subject:      questions.subject,
        wrongCount:   sql<number>`count(*)`.as('wc'),
      })
      .from(sessionResponses)
      .innerJoin(questions, eq(sessionResponses.questionId, questions.id))
      .where(sql`${sessionResponses.userId} = ${userId} AND ${sessionResponses.isCorrect} = 0`)
      .groupBy(sessionResponses.questionId)
      .orderBy(sql`wc desc`)
      .limit(8);

    // Study content snippets for weak subjects
    let contentSnippets = '';
    const weakSubjects = [...new Set(weakTopics.map(t => t.subject).filter(Boolean))] as string[];
    if (weakSubjects.length > 0) {
      const sources = await db
        .select({ title: contentSources.title, subject: contentSources.subject, rawText: contentSources.rawText })
        .from(contentSources)
        .where(and(inArray(contentSources.subject, weakSubjects), eq(contentSources.userId, userId)))
        .limit(3);

      contentSnippets = sources
        .map(s => `[${s.subject} — ${s.title}]\n${(s.rawText ?? '').slice(0, 1500)}`)
        .join('\n\n---\n\n');
    }

    // If no performance data yet, grab any available content as context
    if (!contentSnippets) {
      const anySources = await db
        .select({ title: contentSources.title, subject: contentSources.subject, rawText: contentSources.rawText })
        .from(contentSources)
        .where(eq(contentSources.userId, userId))
        .limit(2);
      contentSnippets = anySources
        .map(s => `[${s.subject ?? 'General'} — ${s.title}]\n${(s.rawText ?? '').slice(0, 1500)}`)
        .join('\n\n---\n\n');
    }

    // ── Build system prompt ──────────────────────────────────────────────────

    const weakTopicsList = weakTopics.length > 0
      ? weakTopics.map(t =>
          `• ${t.topic} (${t.subject}): ${Math.round(t.avgScore ?? 0)}% avg score, ${t.totalAttempts} attempts`
        ).join('\n')
      : 'No performance data yet — introduce yourself and start teaching the available content.';

    const wrongQList = wrongRows.length > 0
      ? wrongRows.map(q => {
          const text = q.questionText ?? q.front ?? q.blankText ?? q.caseQuestion ?? '';
          return `• "${text.slice(0, 120)}" (Topic: ${q.topic ?? 'unknown'}, Wrong ${q.wrongCount}×)`;
        }).join('\n')
      : 'No wrong answers recorded yet.';

    const systemPrompt = `You are MedTutor — an AI medical tutor embedded in a student's study app.
You have full visibility into this student's performance data. Your job is to actively identify weak areas, teach them clearly, and verify understanding — like a personal tutor sitting next to them.

═══ STUDENT PERFORMANCE DATA ═══

WEAK TOPICS (lowest scores first):
${weakTopicsList}

FREQUENTLY MISSED QUESTIONS:
${wrongQList}

${contentSnippets ? `RELEVANT STUDY MATERIAL FROM THEIR CONTENT:\n${contentSnippets}` : ''}

═══ YOUR TEACHING APPROACH ═══

1. DIAGNOSE: On the first message, greet the student warmly, then briefly identify which topic you'll focus on and why (based on their data). If no data, pick the first available topic from their content.
2. TEACH: Explain the concept clearly using their study material. Use analogies, mnemonics, and clinical relevance.
3. TEST: After explaining, ask one targeted question to check understanding. Wait for their answer.
4. FEEDBACK: If correct — praise and go deeper. If wrong — gently correct, re-explain differently, ask again.
5. PROGRESS: After 2 correct answers on a topic, move to the next weak area.
6. REPEAT: Keep going until all weak areas are covered.

STYLE RULES:
- Be warm, encouraging, and clinically precise
- Socratic questioning — don't just lecture
- Keep responses concise (3-6 sentences per turn unless explaining something complex)
- Format key terms in **bold**
- Always end with a question or invitation to respond
- Medical content must be accurate — use the provided study material as ground truth`;

    // ── Stream Groq response ─────────────────────────────────────────────────

    // Groq requires at least one user message — add a starter if conversation is new
    const conversationMessages = messages.length === 0
      ? [{ role: 'user' as const, content: 'Hello, please start my tutoring session.' }]
      : messages;

    const completion = await groq.chat.completions.create({
      model: TUTOR_MODEL,
      temperature: 0.6,
      max_tokens: 800,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationMessages,
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
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Tutor error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

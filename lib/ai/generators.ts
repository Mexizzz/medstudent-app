import { groq, MODEL, FALLBACK_MODEL } from './client';
import { chunkText } from '../utils';
import {
  MCQ_SYSTEM, mcqUserPrompt,
  FLASHCARD_SYSTEM, flashcardUserPrompt,
  FILL_BLANK_SYSTEM, fillBlankUserPrompt,
  SHORT_ANSWER_SYSTEM, shortAnswerUserPrompt,
  CLINICAL_CASE_SYSTEM, clinicalCaseUserPrompt,
  EVAL_SYSTEM, evalUserPrompt,
  PARSE_MCQ_SYSTEM, parseMcqUserPrompt,
} from './prompts';

// Core helper: calls Groq with JSON mode, falls back to smaller model on rate limit
async function callGroqJSON<T>(
  system: string,
  userPrompt: string,
): Promise<T> {
  for (const model of [MODEL, FALLBACK_MODEL]) {
    try {
      const response = await groq.chat.completions.create({
        model,
        temperature: 0.4,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });
      const content = response.choices[0]?.message?.content ?? '{}';
      return JSON.parse(content) as T;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isRateLimit = msg.includes('429') || msg.includes('rate limit');
      if (isRateLimit && model !== FALLBACK_MODEL) {
        console.warn(`Rate limit on ${model}, retrying with ${FALLBACK_MODEL}`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All models exhausted');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedMCQ {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
  topic: string;
  cardType: 'definition' | 'mechanism' | 'clinical' | 'treatment' | 'mnemonic';
}

export interface GeneratedFillBlank {
  blankText: string;
  blankAnswer: string;
  alternativeAnswers?: string[];
  explanation?: string;
  topic: string;
}

export interface GeneratedShortAnswer {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GeneratedClinicalCase {
  caseScenario: string;
  examinationFindings?: string;
  investigations?: string;
  caseQuestion: string;
  caseAnswer: string;
  caseRationale: string;
  teachingPoint?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface EvaluationResult {
  score: number;
  coveredPoints: string[];
  missingPoints: string[];
  feedback: string;
  grade: 'Excellent' | 'Good' | 'Partial' | 'Insufficient';
}

// ─── Chunk helper ─────────────────────────────────────────────────────────────

async function generateAcrossChunks<T>(
  rawText: string,
  totalCount: number,
  subject: string,
  topic: string,
  difficulty: string,
  generatorFn: (chunk: string, count: number, subject: string, topic: string, difficulty: string) => Promise<T[]>,
  focusTopic?: string
): Promise<T[]> {
  const chunks = chunkText(rawText, 5000);
  // If focusing on a specific topic, use fewer chunks (the topic content is likely in a subset)
  const perChunk = Math.ceil(totalCount / (focusTopic ? Math.min(chunks.length, 2) : chunks.length));
  const results: T[] = [];

  for (const chunk of chunks) {
    // Skip chunks that don't mention the focus topic (if set)
    if (focusTopic && !chunk.toLowerCase().includes(focusTopic.toLowerCase())) continue;
    const needed = Math.min(perChunk, totalCount - results.length);
    if (needed <= 0) break;
    try {
      const batch = await generatorFn(chunk, needed, subject, topic, difficulty);
      results.push(...batch);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Surface rate-limit and auth errors immediately — no point continuing
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('401') || msg.includes('403')) {
        throw new Error(msg);
      }
      console.error('Chunk generation error:', e);
    }
  }

  // If no chunks matched the focus topic, fall back to using all chunks
  if (results.length === 0 && focusTopic) {
    for (const chunk of chunks) {
      const needed = Math.min(perChunk, totalCount - results.length);
      if (needed <= 0) break;
      try {
        const batch = await generatorFn(chunk, needed, subject, topic, difficulty);
        results.push(...batch);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('401') || msg.includes('403')) {
          throw new Error(msg);
        }
        console.error('Chunk generation error:', e);
      }
    }
  }

  return results.slice(0, totalCount);
}

// ─── Generators ──────────────────────────────────────────────────────────────

export async function generateMCQs(
  rawText: string,
  count: number,
  subject: string,
  topic: string,
  difficulty: string,
  focusTopic?: string
): Promise<GeneratedMCQ[]> {
  return generateAcrossChunks(rawText, count, subject, topic, difficulty, async (chunk, n, subj, top, diff) => {
    const result = await callGroqJSON<{ questions: GeneratedMCQ[] }>(
      MCQ_SYSTEM,
      mcqUserPrompt(chunk, n, subj, top, diff, focusTopic)
    );
    return result.questions ?? [];
  }, focusTopic);
}

export async function generateFlashcards(
  rawText: string,
  count: number,
  subject: string,
  topic: string,
  focusTopic?: string
): Promise<GeneratedFlashcard[]> {
  return generateAcrossChunks(rawText, count, subject, topic, 'medium', async (chunk, n, subj, top) => {
    const result = await callGroqJSON<{ cards: GeneratedFlashcard[] }>(
      FLASHCARD_SYSTEM,
      flashcardUserPrompt(chunk, n, subj, top, focusTopic)
    );
    return result.cards ?? [];
  }, focusTopic);
}

export async function generateFillBlanks(
  rawText: string,
  count: number,
  subject: string,
  topic: string,
  focusTopic?: string
): Promise<GeneratedFillBlank[]> {
  return generateAcrossChunks(rawText, count, subject, topic, 'medium', async (chunk, n, subj, top) => {
    const result = await callGroqJSON<{ questions: GeneratedFillBlank[] }>(
      FILL_BLANK_SYSTEM,
      fillBlankUserPrompt(chunk, n, subj, top, focusTopic)
    );
    return result.questions ?? [];
  }, focusTopic);
}

export async function generateShortAnswers(
  rawText: string,
  count: number,
  subject: string,
  topic: string,
  difficulty: string,
  focusTopic?: string
): Promise<GeneratedShortAnswer[]> {
  return generateAcrossChunks(rawText, count, subject, topic, difficulty, async (chunk, n, subj, top, diff) => {
    const result = await callGroqJSON<{ questions: GeneratedShortAnswer[] }>(
      SHORT_ANSWER_SYSTEM,
      shortAnswerUserPrompt(chunk, n, subj, top, diff, focusTopic)
    );
    return result.questions ?? [];
  }, focusTopic);
}

export async function generateClinicalCases(
  rawText: string,
  count: number,
  subject: string,
  topic: string,
  focusTopic?: string
): Promise<GeneratedClinicalCase[]> {
  return generateAcrossChunks(rawText, count, subject, topic, 'medium', async (chunk, n, subj, top) => {
    const result = await callGroqJSON<{ cases: GeneratedClinicalCase[] }>(
      CLINICAL_CASE_SYSTEM,
      clinicalCaseUserPrompt(chunk, n, subj, top, focusTopic)
    );
    return result.cases ?? [];
  }, focusTopic);
}

export async function evaluateShortAnswer(
  question: string,
  modelAnswer: string,
  keyPoints: string[],
  userAnswer: string
): Promise<EvaluationResult> {
  const result = await callGroqJSON<EvaluationResult>(
    EVAL_SYSTEM,
    evalUserPrompt(question, modelAnswer, keyPoints, userAnswer)
  );
  return result;
}

/** Split MCQ text at question boundaries (lines starting with a number) to avoid splitting questions across chunks */
function chunkMcqText(text: string, maxChars = 6000): string[] {
  // Split into individual question blocks by detecting "N-" or "N." at line start
  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    // Detect start of a new numbered question (e.g. "1-", "23-", "1.", "23.")
    const isNewQuestion = /^\s*\d+[-.)]\s/.test(line);
    if (isNewQuestion && current.length + line.length > maxChars && current.trim()) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

export async function parseMcqPdf(rawText: string): Promise<GeneratedMCQ[]> {
  const chunks = chunkMcqText(rawText, 6000);

  // Run all chunks in parallel — each chunk is an independent Groq call
  const results = await Promise.all(
    chunks.map(async (chunk, i) => {
      try {
        const result = await callGroqJSON<{ questions: GeneratedMCQ[] }>(
          PARSE_MCQ_SYSTEM,
          parseMcqUserPrompt(chunk)
        );
        return result.questions ?? [];
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('401') || msg.includes('403')) {
          throw new Error(msg);
        }
        console.error(`MCQ parse error (chunk ${i}):`, e);
        return [];
      }
    })
  );

  // Flatten in order (Promise.all preserves order)
  return results.flat();
}

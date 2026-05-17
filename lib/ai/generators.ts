import crypto from 'crypto';
import { groq, getGroq, MODEL } from './client';
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
import { db } from '@/db';
import { generationCache } from '@/db/schema';
import { eq, sql as drizzleSql } from 'drizzle-orm';

// ─── Generation cache ────────────────────────────────────────────────────
// Wraps the LLM call: identical (system + user prompt + maxTokens) returns
// the previously-stored JSON instead of calling the AI again. Two users
// uploading the same source and asking for the same generation only pay
// for the first one.

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheKeyFor(system: string, userPrompt: string, maxTokens: number): string {
  return crypto
    .createHash('sha256')
    .update(`v1|${maxTokens}|${system}\n---\n${userPrompt}`)
    .digest('hex');
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const row = await db.query.generationCache.findFirst({
      where: eq(generationCache.cacheKey, key),
      columns: { result: true, createdAt: true },
    });
    if (!row) return null;
    if (Date.now() - row.createdAt.getTime() > CACHE_TTL_MS) return null;
    return JSON.parse(row.result) as T;
  } catch (e) {
    console.error('generation cache read error:', e);
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    // Don't cache obvious failures.
    if (!serialized || serialized.length < 2) return;
    await db.insert(generationCache).values({
      cacheKey: key,
      result: serialized,
      createdAt: new Date(),
    }).onConflictDoUpdate({
      target: generationCache.cacheKey,
      set: { result: serialized, createdAt: new Date() },
    });
    // Lazy cleanup: 1% chance per write, evict entries older than the TTL.
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - CACHE_TTL_MS);
      await db.delete(generationCache).where(drizzleSql`${generationCache.createdAt} < ${cutoff}`);
    }
  } catch (e) {
    // Cache failure should never block generation.
    console.error('generation cache write error:', e);
  }
}

// Core helper: calls Groq with JSON mode, falls back to smaller model on rate limit
/**
 * Map a generator/Groq error to a user-facing message + HTTP status.
 * Returns null if it's not a known generator error (caller should treat as 500).
 */
export function mapGeneratorError(error: unknown): { status: number; message: string } | null {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('rate_limit_exhausted')) {
    // Daily-limit path: extract the "try again in Xm" hint from Groq's body if present.
    if (msg.includes('tokens per day') || msg.includes('TPD')) {
      const tryAgain = msg.match(/try again in\s+([0-9hms.\s]+)/i);
      const hint = tryAgain ? ` Try again in ${tryAgain[1].trim()}.` : ' Resets at midnight UTC.';
      return {
        status: 503,
        message: `Daily AI quota reached for today.${hint}`,
      };
    }
    return {
      status: 503,
      message: 'AI is rate-limited right now. Please wait ~60 seconds and try again, or generate fewer types at once.',
    };
  }
  if (msg.includes('request_too_large')) {
    return {
      status: 503,
      message: 'This source is too large for the AI in one pass. Try a smaller page range or fewer questions per generation.',
    };
  }
  return null;
}

function isRateLimitMsg(msg: string): boolean {
  return msg.includes('429')
    || msg.includes('rate_limit')
    || msg.includes('rate limit')
    || msg.includes('Rate limit');
}

function isDailyLimitMsg(msg: string): boolean {
  // Groq distinguishes "tokens per minute" (TPM, resets in 60s) vs
  // "tokens per day" (TPD, resets at UTC midnight). Retrying a TPD with
  // 6s+15s backoff is pointless — skip retries and try the fallback.
  return msg.includes('tokens per day') || msg.includes('TPD');
}

function isRequestTooLargeMsg(msg: string): boolean {
  // Groq returns 413 when a single request's tokens exceed the per-minute TPM allowance.
  return msg.includes('413') || msg.includes('Request too large') || msg.includes('tokens per minute');
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function callGroqJSON<T>(
  system: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  // Retry 70B with backoff on rate-limit; TPM resets every 60s.
  const RETRY_DELAYS_MS = [6000, 15000];
  let content = '';
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });
      const finishReason = response.choices[0]?.finish_reason;
      content = response.choices[0]?.message?.content ?? '{}';
      if (finishReason === 'length') {
        console.warn(`Groq response truncated at ${maxTokens} tokens. JSON likely incomplete. Content tail: ${content.slice(-300)}`);
      }
      const parsed = JSON.parse(content) as T;
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        for (const [k, v] of Object.entries(obj)) {
          if (Array.isArray(v) && v.length === 0) {
            console.warn(`Groq returned empty array for key "${k}" (finish=${finishReason}). Content head: ${content.slice(0, 300)}`);
          }
        }
      }
      return parsed;
    } catch (e: unknown) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);

      if (isRequestTooLargeMsg(msg)) {
        console.warn(`Groq request too large: ${msg.slice(0, 200)}`);
        throw new Error(`request_too_large: ${msg}`);
      }

      // Daily limit (TPD) won't recover in 21s of retries — skip straight to fallback.
      if (isDailyLimitMsg(msg)) {
        console.warn(`Groq daily token limit reached — skipping retries, falling back`);
        throw new Error(`rate_limit_exhausted: ${msg}`);
      }

      if (isRateLimitMsg(msg) && attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(`Rate limit on ${MODEL} (attempt ${attempt + 1}), waiting ${delay}ms and retrying`);
        await sleep(delay);
        continue;
      }

      if (isRateLimitMsg(msg)) {
        throw new Error(`rate_limit_exhausted: ${msg}`);
      }

      if (e instanceof SyntaxError) {
        console.error(`Groq JSON parse failed (content length=${content.length}): ${msg}\n  Content tail: ${content.slice(-200)}`);
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Groq retries exhausted');
}

// ─── Gemini fallback ─────────────────────────────────────────────────────────
// Used when Groq is rate-limited or rejects a request as too large. Gemini's
// free tier has ~1M TPM (vs Groq's 30K), so it covers traffic spikes for free.

const GEMINI_MODEL = 'gemini-2.0-flash';

async function callGeminiJSON<T>(
  system: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('gemini_unavailable: GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 429) throw new Error(`rate_limit_exhausted (gemini 429): ${text.slice(0, 200)}`);
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const finish = data?.candidates?.[0]?.finishReason;
  if (finish === 'MAX_TOKENS') {
    console.warn(`Gemini response truncated at ${maxTokens} tokens. Tail: ${content.slice(-200)}`);
  }

  try {
    return JSON.parse(content) as T;
  } catch (e) {
    console.error(`Gemini JSON parse failed (length=${content.length}). Tail: ${content.slice(-200)}`);
    throw e;
  }
}

/**
 * Tries Groq first (fast + cheap). On rate-limit / request-too-large / unrecoverable
 * Groq errors, falls back to Gemini if GEMINI_API_KEY is set. If Gemini also fails
 * (or isn't configured), surfaces the original Groq error so the route layer can
 * map it to a clean user-facing message.
 */
export async function callLLMJSON<T>(
  system: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  const cacheKey = cacheKeyFor(system, userPrompt, maxTokens);
  const cached = await readCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await callGroqJSON<T>(system, userPrompt, maxTokens);
    // Fire-and-forget cache write — don't block the response.
    void writeCache(cacheKey, result);
    return result;
  } catch (groqErr) {
    const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
    const shouldFallback =
      msg.includes('rate_limit_exhausted')
      || msg.includes('request_too_large')
      || msg.includes('500')
      || msg.includes('502')
      || msg.includes('503')
      || msg.includes('504');

    if (!shouldFallback || !process.env.GEMINI_API_KEY) {
      throw groqErr;
    }

    console.warn(`Groq failed (${msg.slice(0, 120)}) — falling back to Gemini`);
    try {
      const result = await callGeminiJSON<T>(system, userPrompt, maxTokens);
      void writeCache(cacheKey, result);
      return result;
    } catch (geminiErr) {
      const gMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.error(`Gemini fallback also failed: ${gMsg.slice(0, 200)}`);
      throw groqErr; // Surface the original Groq error so the user-facing message is meaningful.
    }
  }
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
  // 2000 words per chunk ≈ ~2700 input tokens. With ~3000 output tokens this stays
  // safely under the 8B fallback model's 6000 TPM allowance per single request.
  const chunks = chunkText(rawText, 2000);
  // If focusing on a specific topic, use fewer chunks (the topic content is likely in a subset)
  const perChunk = Math.ceil(totalCount / (focusTopic ? Math.min(chunks.length, 2) : chunks.length));
  const results: T[] = [];

  const runChunk = async (chunk: string, needed: number) => {
    const batch = await generatorFn(chunk, needed, subject, topic, difficulty);
    results.push(...batch);
  };

  const handleChunkError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    // Surface rate-limit / request-too-large / auth / JSON-parse — silently
    // returning [] hides real failures.
    if (
      msg.includes('rate_limit_exhausted')
      || msg.includes('request_too_large')
      || msg.includes('429')
      || msg.includes('413')
      || msg.includes('401')
      || msg.includes('403')
      || e instanceof SyntaxError
    ) {
      throw e instanceof Error ? e : new Error(msg);
    }
    console.error('Chunk generation error:', e);
  };

  for (const chunk of chunks) {
    if (focusTopic && !chunk.toLowerCase().includes(focusTopic.toLowerCase())) continue;
    const needed = Math.min(perChunk, totalCount - results.length);
    if (needed <= 0) break;
    try {
      await runChunk(chunk, needed);
    } catch (e) {
      handleChunkError(e);
    }
  }

  // If no chunks matched the focus topic, fall back to using all chunks
  if (results.length === 0 && focusTopic) {
    for (const chunk of chunks) {
      const needed = Math.min(perChunk, totalCount - results.length);
      if (needed <= 0) break;
      try {
        await runChunk(chunk, needed);
      } catch (e) {
        handleChunkError(e);
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
    const result = await callLLMJSON<{ questions: GeneratedMCQ[] }>(
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
    const result = await callLLMJSON<{ cards: GeneratedFlashcard[] }>(
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
    const result = await callLLMJSON<{ questions: GeneratedFillBlank[] }>(
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
    const result = await callLLMJSON<{ questions: GeneratedShortAnswer[] }>(
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
    const result = await callLLMJSON<{ cases: GeneratedClinicalCase[] }>(
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
  const result = await callLLMJSON<EvaluationResult>(
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
  // Smaller chunks (3000 chars) so each AI call handles fewer questions and doesn't hit token limits
  const chunks = chunkMcqText(rawText, 3000);

  // Run all chunks in parallel — each chunk is an independent Groq call
  const results = await Promise.all(
    chunks.map(async (chunk, i) => {
      try {
        const result = await callLLMJSON<{ questions: GeneratedMCQ[] }>(
          PARSE_MCQ_SYSTEM,
          parseMcqUserPrompt(chunk),
          8192
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

// Vision model — Groq's multimodal Llama 4 for image-based question generation
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function generateMCQsFromImage(
  imageBase64: string,
  mimeType: string,
  count: number,
  subject: string,
  difficulty: string,
  focusTopic?: string,
): Promise<GeneratedMCQ[]> {
  const systemPrompt = `You are a medical educator creating exam-style MCQs from medical images (X-rays, ECGs, histology slides, anatomy diagrams, lab results).

Analyze the image carefully and generate ${count} high-quality MCQ(s).
Return ONLY valid JSON: { "questions": [...] }

Each question:
{
  "question": "Based on this [image type], what is the most likely diagnosis/finding/next step?",
  "optionA": "...",
  "optionB": "...",
  "optionC": "...",
  "optionD": "...",
  "correctAnswer": "A"|"B"|"C"|"D",
  "explanation": "Detailed explanation referencing specific image findings",
  "difficulty": "${difficulty}",
  "topic": "relevant medical topic"
}

Make questions clinically relevant. Reference specific features visible in the image.`;

  const response = await getGroq().chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: `Generate ${count} MCQ(s) about this medical image. Subject: ${subject}. Difficulty: ${difficulty}.${focusTopic ? ` Focus on: ${focusTopic}.` : ''}`,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { questions: GeneratedMCQ[] };
  return parsed.questions ?? [];
}


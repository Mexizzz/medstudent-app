export interface ExamStyleAnalysis {
  questionTypes: string[];
  counts: Record<string, number>;
  totalDetected: number;
  stemStyle: string;
  clinicalIntegration: boolean;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  topicsPattern: string;
  phrasingPatterns: string[];
  languageStyle: string;
}

export type QuestionMode = 'mcq' | 'written' | 'structured' | 'table' | 'mixed';

export interface GeneratedLabQuestion {
  type: 'mcq' | 'short_answer';
  question: string;
  // MCQ fields
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  // Short answer / structured fields
  modelAnswer?: string;
  keyPoints?: string[];    // for structured: section headers in exam order; for table: property names
  // Common
  topic: string;
  difficulty: string;
  // Flags so UI knows how to render
  structured?: boolean;
  tableFormat?: boolean;   // "Describe X regarding the following items" table format
}

// ─── AI Prompts ──────────────────────────────────────────────────────────────

export const ANALYZE_SYSTEM = `You are an expert at analyzing university exam question patterns.
Extract the question style, structure, difficulty, and format from the provided exam questions.
Return ONLY valid JSON — no extra text, no markdown, no code fences.`;

export function analyzeUserPrompt(text: string): string {
  return `Analyze the following university exam questions and extract their style pattern.

Return this exact JSON structure (all fields required):
{
  "questionTypes": ["mcq"],
  "counts": { "mcq": 0 },
  "totalDetected": 0,
  "stemStyle": "1-2 sentence description of how question stems are written",
  "clinicalIntegration": false,
  "difficultyLevel": "medium",
  "topicsPattern": "what subjects and topics are covered",
  "phrasingPatterns": ["example opening phrase 1", "example opening phrase 2"],
  "languageStyle": "e.g. Clinical USMLE-style, single best answer"
}

questionTypes must be an array containing any of: "mcq", "short_answer", "clinical_case", "fill_blank".
clinicalIntegration = true if questions use patient scenario vignettes.
difficultyLevel must be exactly "easy", "medium", or "hard".

EXAM QUESTIONS:
${text}`;
}

export const GENERATE_SYSTEM = `You are a medical exam question generator.
Generate questions that EXACTLY match the style, phrasing, and difficulty of the provided university exam profile.
The question style, wording, and format MUST come from the exam profile — do not impose any other style.
Base ALL content ONLY on the study material — never add information not present in the material.

ACCURACY RULES (non-negotiable):
- MCQ: correctAnswer is always a single letter (A, B, C, or D) — exactly ONE correct answer.
- Every MCQ must have one unambiguously correct answer and three clearly wrong distractors.
- The correct answer must be explicitly supported by the study material. Wrong options must be factually incorrect.

Return ONLY valid JSON — no extra text, no markdown, no code fences.`;

const MCQ_SCHEMA = `{
  "type": "mcq",
  "question": "question stem here",
  "optionA": "option text",
  "optionB": "option text",
  "optionC": "option text",
  "optionD": "option text",
  "correctAnswer": "A",
  "explanation": "why correct answer is right and why each distractor is wrong",
  "topic": "specific sub-topic from the material",
  "difficulty": "DIFFICULTY"
}`;

const SHORT_ANSWER_SCHEMA = `{
  "type": "short_answer",
  "question": "question text here",
  "modelAnswer": "complete model answer (3-5 sentences covering all key aspects)",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "topic": "specific sub-topic from the material",
  "difficulty": "DIFFICULTY"
}`;

// Structured = numbered sections, "always answer in this order" format
const STRUCTURED_SCHEMA = `{
  "type": "short_answer",
  "structured": true,
  "question": "Describe [topic] / Discuss [topic] regarding [aspects]",
  "keyPoints": ["1. Definition", "2. Structure", "3. Types", "4. Functions"],
  "modelAnswer": "1. DEFINITION\\n→ [point 1]\\n→ [point 2]\\n\\n2. STRUCTURE\\n→ [point 1]\\n→ [point 2]\\n\\n3. TYPES\\n→ [type A]: description\\n→ [type B]: description\\n\\n4. FUNCTIONS\\n→ [function 1]\\n→ [function 2]",
  "topic": "specific topic from material",
  "difficulty": "DIFFICULTY"
}`;

export const STRUCTURED_SYSTEM = `You are a medical exam question generator that creates structured point-form questions.
Your questions match the university exam style where answers must be written in numbered sections in a specific order.
Base ALL content ONLY on the study material — never add information not present in the material.
Return ONLY valid JSON — no extra text, no markdown, no code fences.`;

export function generateStructuredPrompt(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
): string {
  const diff = styleAnalysis.difficultyLevel;
  return `UNIVERSITY EXAM STYLE PROFILE:
${JSON.stringify(styleAnalysis, null, 2)}

STUDY MATERIAL (base every question on this content ONLY):
${material}

Generate exactly ${count} structured "Describe X" / "Discuss X" exam questions.

RULES:
1. Question style: "Describe [topic]" or "Discuss [topic] regarding [aspects]" — typical university written exam phrasing
2. keyPoints = section HEADERS in the exact order the student must write them in the exam (e.g. ["1. Definition", "2. Structure", "3. Types", "4. Functions"])
3. modelAnswer = full structured answer with ALL sections, formatted as:
   "1. SECTION NAME\\n→ point\\n→ point\\n\\n2. NEXT SECTION\\n→ point\\n→ point"
4. Each section: 2-4 short bullet points starting with →
5. Where useful, add a memory trick as a final bullet: "🧠 Memory: ..."
6. Difficulty: ${diff}
7. Subject context: ${subject || 'Medical sciences'}
8. Every question must cover a DIFFERENT topic from the study material

Return this exact JSON:
{
  "questions": [
    ${STRUCTURED_SCHEMA.replace(/DIFFICULTY/g, diff)}
  ]
}

CRITICAL: Generate EXACTLY ${count} questions. All content must come from the study material.`;
}

// Table = "Describe X regarding the following items" with 2-col property/answer table
const TABLE_SCHEMA = `{
  "type": "short_answer",
  "tableFormat": true,
  "question": "Describe [topic] regarding the following items:",
  "keyPoints": ["Origin", "Shape", "Nucleus", "Cytoplasm", "Special stain", "Functions"],
  "modelAnswer": "Origin: answer text\\nShape: answer text\\nNucleus: answer text\\nCytoplasm: answer text\\nSpecial stain: answer text\\nFunctions: function 1; function 2",
  "topic": "specific topic from material",
  "difficulty": "DIFFICULTY"
}`;

export const TABLE_SYSTEM = `You are a medical exam question generator that creates table-format questions.
Your questions follow the university exam style: "Describe [topic] regarding the following items:" with a two-column table listing properties and their answers.
Base ALL content ONLY on the study material — never add information not present in the material.
Return ONLY valid JSON — no extra text, no markdown, no code fences.`;

export function generateTablePrompt(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
): string {
  const diff = styleAnalysis.difficultyLevel;
  return `UNIVERSITY EXAM STYLE PROFILE:
${JSON.stringify(styleAnalysis, null, 2)}

STUDY MATERIAL (base every question on this content ONLY):
${material}

Generate exactly ${count} table-format questions.

RULES:
1. Question format: "Describe [topic] regarding the following items:" — standard university table question phrasing
2. keyPoints = the property/row headers in the left column of the table (e.g. ["Origin", "Shape", "Nucleus", "Cytoplasm", "Special stain", "Functions"])
   - Choose 4-7 meaningful properties from the study material that can be described for the topic
   - Use short noun phrases as headers (Origin, Shape, Staining, Classification, etc.)
3. modelAnswer = answers for each property, one per line in this exact format:
   "Property: answer text\\nProperty2: answer text\\n..."
   - Each answer is a concise, exam-ready phrase (not a full sentence unless needed)
   - Property name MUST exactly match the corresponding keyPoints entry
4. Difficulty: ${diff}
5. Subject context: ${subject || 'Medical sciences'}
6. Every question must cover a DIFFERENT topic from the study material

Return this exact JSON:
{
  "questions": [
    ${TABLE_SCHEMA.replace(/DIFFICULTY/g, diff)}
  ]
}

CRITICAL: Generate EXACTLY ${count} questions. All content must come from the study material.`;
}

export function generateUserPrompt(
  styleAnalysis: ExamStyleAnalysis,
  material: string,
  count: number,
  subject: string,
  mode: QuestionMode = 'mcq',
): string {
  const diff = styleAnalysis.difficultyLevel;

  let formatInstruction: string;
  let schema: string;

  if (mode === 'written') {
    formatInstruction = `Generate exactly ${count} written/short answer questions.`;
    schema = SHORT_ANSWER_SCHEMA.replace(/DIFFICULTY/g, diff);
  } else if (mode === 'mixed') {
    const half = Math.ceil(count / 2);
    formatInstruction = `Generate exactly ${count} questions — roughly ${half} MCQ and ${count - half} written/short answer, mixed together.`;
    schema = `MCQ format:\n${MCQ_SCHEMA.replace(/DIFFICULTY/g, diff)}\n\nShort answer format:\n${SHORT_ANSWER_SCHEMA.replace(/DIFFICULTY/g, diff)}`;
  } else {
    formatInstruction = `Generate exactly ${count} multiple choice questions.`;
    schema = MCQ_SCHEMA.replace(/DIFFICULTY/g, diff);
  }

  return `UNIVERSITY EXAM STYLE PROFILE:
${JSON.stringify(styleAnalysis, null, 2)}

STUDY MATERIAL (base every question on this content ONLY):
${material}

${formatInstruction}
Questions must:
1. Follow the exam style profile EXACTLY — same phrasing patterns, difficulty (${diff}), format
2. Use clinical vignettes if clinicalIntegration = ${styleAnalysis.clinicalIntegration}
3. Be based entirely on the study material — NEVER invent facts
4. Cover different sub-topics from the material
5. Subject context: ${subject || 'Medical sciences'}

MCQ ACCURACY RULE: Each MCQ must have exactly ONE correct answer (letter A, B, C, or D). The three distractors must be factually incorrect based on the study material — not just less precise.

Return this exact JSON:
{
  "questions": [
    ${schema}
  ]
}

CRITICAL: Generate EXACTLY ${count} questions. All content must come from the study material.`;
}

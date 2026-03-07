// ─── MCQ ─────────────────────────────────────────────────────────────────────
export const MCQ_SYSTEM = `You are an expert medical educator creating high-quality multiple choice questions for medical students.

ABSOLUTE RULE — CONTENT FIDELITY:
- You may ONLY ask about information that is EXPLICITLY STATED in the provided content.
- NEVER add outside medical knowledge. If the content says "Cell membrane contains lipids" but does NOT mention its function, you must NOT ask about its function.
- If the content is a classification or diagram, ask about the classifications, categories, and relationships shown — NOT about functions, mechanisms, or details that are not written.
- Every answer (correct AND wrong options) must be verifiable from the provided text.
- If you cannot create a question purely from the content, reduce the question count rather than inventing information.

CRITICAL ACCURACY RULES:
- The student selects EXACTLY ONE letter (A, B, C, or D) — correctAnswer is always a single letter.
- Every question must have exactly ONE correct answer and THREE clearly wrong distractors.
- The correct answer must be explicitly stated in or directly derivable from the provided content.

You MUST respond with valid JSON only. No text outside the JSON object.`;

export function mcqUserPrompt(text: string, count: number, subject: string, topic: string, difficulty: string, focusTopic?: string): string {
  return `Based on the following medical content, generate exactly ${count} multiple choice questions.

Content topic: ${subject} — ${topic}
Difficulty level: ${difficulty}${focusTopic ? `\n\nFOCUS: Generate ALL questions specifically about "${focusTopic}". Every question must be related to this sub-topic.` : ''}

CONTENT:
${text}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- correctAnswer is always a single letter (A, B, C, or D) — one unambiguous correct answer
- Each wrong option must be factually incorrect based on the provided content, not just less precise
- Explanation must reference WHERE in the content the answer is found (quote or paraphrase the relevant part)
- STRICTLY use ONLY information from the provided content — absolutely NO outside medical knowledge
- If the content lists categories/classifications, ask about those — do NOT ask about functions or mechanisms unless they are explicitly written in the content
- Do NOT generate questions whose answers require knowledge beyond the provided text

IMPORTANT: The "topic" field must be a SPECIFIC sub-topic from the content (e.g. "Cell Membrane", "Nucleus", "Mitochondria"), NOT the general subject name. Each question should have the most specific topic possible.

Return ONLY this JSON (no other text):
{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"...","difficulty":"medium","topic":"..."}]}`;
}

export const MCQ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question:      { type: 'string' },
          optionA:       { type: 'string' },
          optionB:       { type: 'string' },
          optionC:       { type: 'string' },
          optionD:       { type: 'string' },
          correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation:   { type: 'string' },
          difficulty:    { type: 'string', enum: ['easy', 'medium', 'hard'] },
          topic:         { type: 'string' },
        },
        required: ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

// ─── FLASHCARD ────────────────────────────────────────────────────────────────
export const FLASHCARD_SYSTEM = `You are a medical educator creating effective spaced-repetition flashcards.
Each card should test one discrete concept. Fronts should be clear questions or prompts.
Backs should be concise but complete — enough to fully answer the front.

ABSOLUTE RULE: Use ONLY information explicitly stated in the provided content. NEVER add outside knowledge. If the content shows a classification, ask about the classification — not about functions or mechanisms unless they are explicitly written. Every answer on the back MUST be verifiable from the provided text.

You MUST respond with valid JSON only. No text outside the JSON object.`;

export function flashcardUserPrompt(text: string, count: number, subject: string, topic: string, focusTopic?: string): string {
  return `Generate exactly ${count} flashcards from the following medical content.

Content topic: ${subject} — ${topic}${focusTopic ? `\n\nFOCUS: Generate ALL flashcards specifically about "${focusTopic}". Every card must be related to this sub-topic.` : ''}

CONTENT:
${text}

Include cards ONLY for information present in the content. Possible types:
- Definition cards (What is X?) — only if definitions are given
- Classification cards (Which category does X belong to?) — for classification content
- Listing cards (What are the types of X?) — for enumerated lists
- Mechanism cards (How does X work?) — only if mechanisms are described
- Clinical cards — only if clinical info is in the content
Do NOT create cards about topics not covered in the content.

IMPORTANT: The "topic" field must be a SPECIFIC sub-topic from the content (e.g. "Cell Membrane", "Nucleus", "Mitochondria"), NOT the general subject name.

Return ONLY this JSON (no other text):
{"cards":[{"front":"...","back":"...","topic":"...","cardType":"definition"}]}`;
}

export const FLASHCARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front:    { type: 'string' },
          back:     { type: 'string' },
          topic:    { type: 'string' },
          cardType: { type: 'string', enum: ['definition', 'mechanism', 'clinical', 'treatment', 'mnemonic'] },
        },
        required: ['front', 'back', 'topic', 'cardType'],
      },
    },
  },
  required: ['cards'],
};

// ─── FILL IN BLANK ────────────────────────────────────────────────────────────
export const FILL_BLANK_SYSTEM = `You are creating fill-in-the-blank exercises for medical students.
Blanks should test key medical terms, categories, or concepts FROM THE PROVIDED CONTENT ONLY.
Sentences should be accurate with the blank replaced by [BLANK].
Never create blanks for common words like "the", "is", "and", etc.

ABSOLUTE RULE: Every sentence and answer must come ONLY from information explicitly stated in the provided content. NEVER use outside knowledge. If the content is a diagram or classification, create blanks about the categories and relationships shown.

You MUST respond with valid JSON only. No text outside the JSON object.`;

export function fillBlankUserPrompt(text: string, count: number, subject: string, topic: string, focusTopic?: string): string {
  return `Generate exactly ${count} fill-in-the-blank questions from the following content.

Content topic: ${subject} — ${topic}${focusTopic ? `\n\nFOCUS: Generate ALL questions specifically about "${focusTopic}". Every question must be related to this sub-topic.` : ''}

CONTENT:
${text}

Rules:
- Replace one key term per sentence with [BLANK]
- The blank should be a clinically important term (drug name, mechanism, value, diagnosis)
- Sentence should be meaningful and educational as a standalone
- Include the exact correct answer
- Include 1-3 alternative acceptable answers if applicable
- Include a brief explanation (1-2 sentences)

IMPORTANT: The "topic" field must be a SPECIFIC sub-topic from the content (e.g. "Cell Membrane", "Nucleus", "Mitochondria"), NOT the general subject name.

Return ONLY this JSON (no other text):
{"questions":[{"blankText":"sentence with [BLANK]","blankAnswer":"...","alternativeAnswers":["..."],"explanation":"...","topic":"..."}]}`;
}

export const FILL_BLANK_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blankText:          { type: 'string' },
          blankAnswer:        { type: 'string' },
          alternativeAnswers: { type: 'array', items: { type: 'string' } },
          explanation:        { type: 'string' },
          topic:              { type: 'string' },
        },
        required: ['blankText', 'blankAnswer', 'topic'],
      },
    },
  },
  required: ['questions'],
};

// ─── SHORT ANSWER ─────────────────────────────────────────────────────────────
export const SHORT_ANSWER_SYSTEM = `You are a medical examiner creating short-answer questions for medical students.
Model answers should be structured and cover key points from the provided content.

ABSOLUTE RULE: Questions and answers must be based ONLY on information explicitly in the provided content. NEVER add outside knowledge. If the content is a classification or list, ask about those — not about mechanisms or functions unless explicitly covered.

You MUST respond with valid JSON only. No text outside the JSON object.`;

export function shortAnswerUserPrompt(text: string, count: number, subject: string, topic: string, difficulty: string, focusTopic?: string): string {
  return `Generate exactly ${count} short-answer questions from the following content.

Content topic: ${subject} — ${topic}
Difficulty: ${difficulty}${focusTopic ? `\n\nFOCUS: Generate ALL questions specifically about "${focusTopic}". Every question must be related to this sub-topic.` : ''}

CONTENT:
${text}

Ask questions ONLY about what is in the content. Possible types:
- "List the types/categories of..."
- "Compare and contrast X and Y..."
- "Describe..." (only if details are in the content)
- "What are the characteristics of..."
Do NOT ask about functions, mechanisms, or treatments unless they are explicitly in the content.

For each question provide:
1. The question itself
2. A model answer (3-6 sentences, complete and accurate)
3. A list of 3-5 key points that must be mentioned for full marks

IMPORTANT: The "topic" field must be a SPECIFIC sub-topic from the content (e.g. "Cell Membrane", "Nucleus", "Mitochondria"), NOT the general subject name.

Return ONLY this JSON (no other text):
{"questions":[{"question":"...","modelAnswer":"...","keyPoints":["...","...","..."],"topic":"...","difficulty":"medium"}]}`;
}

export const SHORT_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question:    { type: 'string' },
          modelAnswer: { type: 'string' },
          keyPoints:   { type: 'array', items: { type: 'string' } },
          topic:       { type: 'string' },
          difficulty:  { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['question', 'modelAnswer', 'keyPoints', 'topic'],
      },
    },
  },
  required: ['questions'],
};

// ─── CLINICAL CASE ────────────────────────────────────────────────────────────
export const CLINICAL_CASE_SYSTEM = `You are a clinical educator creating realistic patient case scenarios for medical students.
Cases should follow the structure of a real clinical encounter and test clinical reasoning.

ABSOLUTE RULE: Cases must be based ONLY on information explicitly in the provided content. The diagnosis, mechanism, or teaching point must be directly covered in the content. NEVER create cases about conditions or concepts not mentioned in the content.

You MUST respond with valid JSON only. No text outside the JSON object.`;

export function clinicalCaseUserPrompt(text: string, count: number, subject: string, topic: string, focusTopic?: string): string {
  return `Generate exactly ${count} clinical case scenarios based on the following medical content.

Content topic: ${subject} — ${topic}${focusTopic ? `\n\nFOCUS: Generate ALL cases specifically about "${focusTopic}". Every case must be related to this sub-topic.` : ''}

CONTENT:
${text}

Each case must include:
1. caseScenario: Patient presentation (age, sex, chief complaint, history, 3-5 sentences)
2. examinationFindings: Relevant positive and negative physical exam findings
3. investigations: Key investigation results with realistic values
4. caseQuestion: A focused clinical question (diagnosis, next step, management, mechanism)
5. caseAnswer: The correct answer (concise, 1-2 sentences)
6. caseRationale: Full clinical explanation (3-5 sentences) including why alternatives are incorrect
7. teachingPoint: Key learning objective (1 sentence)

Make cases feel like real patients with realistic values.

IMPORTANT: The "topic" field must be a SPECIFIC sub-topic from the content (e.g. "Cell Membrane", "Nucleus", "Mitochondria"), NOT the general subject name.

Return ONLY this JSON (no other text):
{"cases":[{"caseScenario":"...","examinationFindings":"...","investigations":"...","caseQuestion":"...","caseAnswer":"...","caseRationale":"...","teachingPoint":"...","topic":"...","difficulty":"medium"}]}`;
}

export const CLINICAL_CASE_SCHEMA = {
  type: 'object',
  properties: {
    cases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          caseScenario:        { type: 'string' },
          examinationFindings: { type: 'string' },
          investigations:      { type: 'string' },
          caseQuestion:        { type: 'string' },
          caseAnswer:          { type: 'string' },
          caseRationale:       { type: 'string' },
          teachingPoint:       { type: 'string' },
          topic:               { type: 'string' },
          difficulty:          { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['caseScenario', 'caseQuestion', 'caseAnswer', 'caseRationale', 'topic'],
      },
    },
  },
  required: ['cases'],
};

// ─── EVALUATION ───────────────────────────────────────────────────────────────
export const EVAL_SYSTEM = `You are a medical examiner grading a student's short-answer response.
Be constructive and educational in your feedback.
Focus on medical accuracy and coverage of key concepts.
You MUST respond with valid JSON only. No text outside the JSON object.`;

export function evalUserPrompt(
  question: string,
  modelAnswer: string,
  keyPoints: string[],
  userAnswer: string
): string {
  return `Grade this student's short-answer response.

QUESTION: ${question}

MODEL ANSWER: ${modelAnswer}

KEY POINTS REQUIRED:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

STUDENT'S ANSWER: ${userAnswer}

Score the student from 0.0 to 1.0 based on:
- Coverage of key points (primary factor, 70%)
- Medical accuracy (penalize incorrect statements, 20%)
- Clarity of explanation (10%)

Grade labels: Excellent (>=0.85), Good (0.65-0.84), Partial (0.40-0.64), Insufficient (<0.40)

Return ONLY this JSON (no other text):
{"score":0.0,"coveredPoints":["..."],"missingPoints":["..."],"feedback":"2-3 sentences of feedback","grade":"Good"}`;
}

export const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    score:          { type: 'number', description: '0.0 to 1.0' },
    coveredPoints:  { type: 'array', items: { type: 'string' } },
    missingPoints:  { type: 'array', items: { type: 'string' } },
    feedback:       { type: 'string', description: '2-3 sentences of constructive feedback' },
    grade:          { type: 'string', enum: ['Excellent', 'Good', 'Partial', 'Insufficient'] },
  },
  required: ['score', 'coveredPoints', 'missingPoints', 'feedback', 'grade'],
};

// ─── PARSE EXISTING MCQ PDF ───────────────────────────────────────────────────
export const PARSE_MCQ_SYSTEM = `You are extracting multiple choice questions from a PDF document.
The questions follow this format:
  N- Question stem text:
  a) Option text
  b) Option text
  c) Option text
  d) Option text

CRITICAL RULES:
- "question" field = ONLY the question stem (the text before the options a/b/c/d). Do NOT include option text in the question field.
- "optionA" = text of option a) only (no letter prefix)
- "optionB" = text of option b) only
- "optionC" = text of option c) only
- "optionD" = text of option d) only
- "correctAnswer" = uppercase letter A, B, C, or D — use your medical knowledge to identify the correct answer
- "explanation" = brief explanation of why the correct answer is right
- "topic" = specific sub-topic (e.g. "Cell Membrane", "Mitochondria", "Lysosomes")
You MUST respond with valid JSON only. No text outside the JSON object.`;

export function parseMcqUserPrompt(text: string): string {
  return `Extract all multiple choice questions from the text below.

IMPORTANT: Separate the question stem from the options. The "question" field must contain ONLY the question stem text — NOT the options. Each option (a, b, c, d) goes into optionA, optionB, optionC, optionD separately without the letter prefix.

Use your medical knowledge to identify the correct answer for each question and set correctAnswer to A, B, C, or D.

TEXT:
${text}

Return ONLY this JSON (no other text):
{"questions":[{"question":"The question stem only — no options here","optionA":"first option text","optionB":"second option text","optionC":"third option text","optionD":"fourth option text","correctAnswer":"B","explanation":"Brief reason why B is correct","difficulty":"medium","topic":"Cell Membrane"}]}`;
}

"""
Export MedStudy DB → JSONL training data for fine-tuning Llama 3.1 8B
Outputs: training_data.jsonl (instruction-response pairs)
Run: python export_training_data.py
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medstudent_prod.db")
OUT_PATH = os.path.join(os.path.dirname(__file__), "training_data.jsonl")

def fmt(text):
    return (text or "").strip()

def build_alpaca_entry(instruction, response, input_ctx=""):
    """Alpaca format — works with Unsloth's SFTTrainer out of the box."""
    if input_ctx:
        text = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Input:\n{input_ctx}\n\n"
            f"### Response:\n{response}"
        )
    else:
        text = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Response:\n{response}"
        )
    return {"text": text, "instruction": instruction, "input": input_ctx, "output": response}

def export_mcq(cursor, entries):
    cursor.execute("""
        SELECT question, option_a, option_b, option_c, option_d,
               correct_answer, explanation, subject, topic, difficulty
        FROM questions
        WHERE type = 'mcq'
          AND question IS NOT NULL
          AND correct_answer IS NOT NULL
    """)
    for row in cursor.fetchall():
        q, a, b, c, d, correct, explanation, subject, topic, difficulty = row
        options = []
        if a: options.append(f"A) {fmt(a)}")
        if b: options.append(f"B) {fmt(b)}")
        if c: options.append(f"C) {fmt(c)}")
        if d: options.append(f"D) {fmt(d)}")

        instruction = f"Answer the following multiple choice question about {fmt(subject) or 'medicine'} - {fmt(topic) or 'general'}."
        input_ctx = fmt(q) + "\n" + "\n".join(options)

        response_parts = [f"The correct answer is {fmt(correct)}."]
        if explanation:
            response_parts.append(fmt(explanation))
        response = "\n\n".join(response_parts)

        entries.append(build_alpaca_entry(instruction, response, input_ctx))

        # Also generate a "why wrong" variant for wrong options
        if explanation:
            instruction2 = f"Explain why the correct answer to this {fmt(subject) or 'medical'} question is {fmt(correct)} and not the other options."
            entries.append(build_alpaca_entry(instruction2, response, input_ctx))

def export_flashcards(cursor, entries):
    cursor.execute("""
        SELECT front, back, subject, topic
        FROM questions
        WHERE type = 'flashcard'
          AND front IS NOT NULL
          AND back IS NOT NULL
    """)
    for row in cursor.fetchall():
        front, back, subject, topic = row
        instruction = f"You are a medical tutor. Explain the following concept related to {fmt(subject) or 'medicine'} - {fmt(topic) or 'general'}."
        entries.append(build_alpaca_entry(instruction, fmt(back), fmt(front)))

        # Reverse: generate question from answer
        instruction2 = f"What medical question or concept does the following answer describe? Topic: {fmt(topic) or 'general'}."
        entries.append(build_alpaca_entry(instruction2, fmt(front), fmt(back)))

def export_fill_blank(cursor, entries):
    cursor.execute("""
        SELECT blank_text, blank_answer, alternative_answers, subject, topic
        FROM questions
        WHERE type = 'fill_blank'
          AND blank_text IS NOT NULL
          AND blank_answer IS NOT NULL
    """)
    for row in cursor.fetchall():
        blank_text, blank_answer, alts, subject, topic = row
        instruction = f"Fill in the blank in the following medical statement about {fmt(subject) or 'medicine'}."
        response = fmt(blank_answer)
        if alts:
            try:
                alt_list = json.loads(alts)
                if alt_list:
                    response += f"\n\nAlternative acceptable answers: {', '.join(alt_list)}"
            except Exception:
                pass
        entries.append(build_alpaca_entry(instruction, response, fmt(blank_text)))

def export_short_answer(cursor, entries):
    cursor.execute("""
        SELECT question, model_answer, key_points, subject, topic
        FROM questions
        WHERE type = 'short_answer'
          AND question IS NOT NULL
          AND model_answer IS NOT NULL
    """)
    for row in cursor.fetchall():
        q, model_answer, key_points, subject, topic = row
        instruction = f"Answer the following short answer medical question about {fmt(subject) or 'medicine'} - {fmt(topic) or 'general'}."
        response = fmt(model_answer)
        if key_points:
            try:
                kp = json.loads(key_points)
                if kp:
                    response += f"\n\nKey points:\n" + "\n".join(f"- {p}" for p in kp)
            except Exception:
                response += f"\n\nKey points: {fmt(key_points)}"
        entries.append(build_alpaca_entry(instruction, response, fmt(q)))

def export_clinical_cases(cursor, entries):
    cursor.execute("""
        SELECT case_scenario, examination_findings, investigations,
               case_question, case_answer, case_rationale, teaching_point,
               subject, topic
        FROM questions
        WHERE type = 'clinical_case'
          AND case_scenario IS NOT NULL
          AND case_answer IS NOT NULL
    """)
    for row in cursor.fetchall():
        scenario, exam_findings, investigations, case_q, case_answer, rationale, teaching, subject, topic = row

        context_parts = [f"Clinical Case:\n{fmt(scenario)}"]
        if exam_findings:
            context_parts.append(f"Examination Findings:\n{fmt(exam_findings)}")
        if investigations:
            context_parts.append(f"Investigations:\n{fmt(investigations)}")
        if case_q:
            context_parts.append(f"Question:\n{fmt(case_q)}")

        input_ctx = "\n\n".join(context_parts)
        instruction = f"You are a clinical medicine tutor. Analyze this clinical case about {fmt(subject) or 'medicine'} and provide a detailed answer."

        response_parts = [fmt(case_answer)]
        if rationale:
            response_parts.append(f"Rationale:\n{fmt(rationale)}")
        if teaching:
            response_parts.append(f"Teaching Point:\n{fmt(teaching)}")
        response = "\n\n".join(response_parts)

        entries.append(build_alpaca_entry(instruction, response, input_ctx))

def export_ai_feedback(cursor, entries):
    """Use AI feedback from session responses as training signal."""
    cursor.execute("""
        SELECT q.question, q.correct_answer, q.explanation,
               sr.user_answer, sr.ai_feedback, sr.is_correct,
               q.subject, q.topic, q.type
        FROM session_responses sr
        JOIN questions q ON sr.question_id = q.id
        WHERE sr.ai_feedback IS NOT NULL
          AND sr.ai_feedback != ''
          AND q.question IS NOT NULL
    """)
    for row in cursor.fetchall():
        question, correct, explanation, user_answer, ai_feedback, is_correct, subject, topic, qtype = row
        if not ai_feedback or len(fmt(ai_feedback)) < 20:
            continue

        instruction = f"A medical student answered the following {fmt(qtype)} question about {fmt(subject) or 'medicine'}. Provide detailed feedback on their answer."
        input_ctx = (
            f"Question: {fmt(question)}\n"
            f"Correct Answer: {fmt(correct)}\n"
            f"Student's Answer: {fmt(user_answer)}\n"
            f"Is Correct: {'Yes' if is_correct else 'No'}"
        )
        entries.append(build_alpaca_entry(instruction, fmt(ai_feedback), input_ctx))

def export_tutor_conversations(cursor, entries):
    """Pull any lesson content as teaching material."""
    cursor.execute("""
        SELECT title, topic, overview, sections, summary, clinical_relevance
        FROM lessons
        WHERE overview IS NOT NULL
    """)
    for row in cursor.fetchall():
        title, topic, overview, sections_json, summary, clinical = row
        instruction = f"Teach me about {fmt(title)} in medicine. Include clinical relevance."
        response_parts = [fmt(overview)]
        if sections_json:
            try:
                sections = json.loads(sections_json)
                for s in sections:
                    if isinstance(s, dict):
                        heading = s.get('heading') or s.get('title', '')
                        content = s.get('content') or s.get('body', '')
                        if heading and content:
                            response_parts.append(f"## {heading}\n{content}")
            except Exception:
                pass
        if summary:
            response_parts.append(f"Summary: {fmt(summary)}")
        if clinical:
            response_parts.append(f"Clinical Relevance: {fmt(clinical)}")
        response = "\n\n".join(response_parts)
        if len(response) > 100:
            entries.append(build_alpaca_entry(instruction, response))

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    entries = []

    print("Exporting MCQ questions...")
    export_mcq(cursor, entries)
    print(f"  -> {len(entries)} entries so far")

    prev = len(entries)
    print("Exporting flashcards...")
    export_flashcards(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    prev = len(entries)
    print("Exporting fill-in-the-blank...")
    export_fill_blank(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    prev = len(entries)
    print("Exporting short answer questions...")
    export_short_answer(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    prev = len(entries)
    print("Exporting clinical cases...")
    export_clinical_cases(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    prev = len(entries)
    print("Exporting AI feedback from sessions...")
    export_ai_feedback(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    prev = len(entries)
    print("Exporting lesson content...")
    export_tutor_conversations(cursor, entries)
    print(f"  -> {len(entries) - prev} new entries")

    conn.close()

    # Filter out entries with too-short responses
    entries = [e for e in entries if len(e["output"]) >= 20]

    # Write JSONL
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"\nDone! {len(entries)} training examples -> {OUT_PATH}")

    # Stats
    if entries:
        avg_len = sum(len(e["text"]) for e in entries) / len(entries)
        print(f"Average entry length: {avg_len:.0f} chars")
        print(f"\nSample entry:")
        print(json.dumps(entries[0], indent=2, ensure_ascii=False)[:800])

if __name__ == "__main__":
    main()

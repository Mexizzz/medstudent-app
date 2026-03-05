import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const contentSources = sqliteTable('content_sources', {
  id:          text('id').primaryKey(),
  type:        text('type').notNull(), // 'pdf' | 'youtube' | 'mcq_pdf'
  title:       text('title').notNull(),
  description: text('description'),
  subject:     text('subject'),
  topic:       text('topic'),
  filePath:    text('file_path'),
  youtubeUrl:  text('youtube_url'),
  youtubeId:   text('youtube_id'),
  rawText:     text('raw_text'),
  wordCount:   integer('word_count'),
  pageCount:   integer('page_count'),
  status:      text('status').default('pending'), // 'pending' | 'ready' | 'error'
  errorMsg:    text('error_msg'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const questions = sqliteTable('questions', {
  id:            text('id').primaryKey(),
  sourceId:      text('source_id').references(() => contentSources.id, { onDelete: 'cascade' }),
  type:          text('type').notNull(), // 'mcq' | 'flashcard' | 'fill_blank' | 'short_answer' | 'clinical_case'
  subject:       text('subject'),
  topic:         text('topic'),
  difficulty:    text('difficulty').default('medium'), // 'easy' | 'medium' | 'hard'

  // MCQ + short_answer + clinical_case
  question:      text('question'),

  // MCQ
  optionA:       text('option_a'),
  optionB:       text('option_b'),
  optionC:       text('option_c'),
  optionD:       text('option_d'),
  correctAnswer: text('correct_answer'),

  // Flashcard
  front:         text('front'),
  back:          text('back'),
  cardType:      text('card_type'), // 'definition' | 'mechanism' | 'clinical' | 'treatment' | 'mnemonic'

  // Fill-in-the-blank
  blankText:         text('blank_text'),
  blankAnswer:       text('blank_answer'),
  alternativeAnswers:text('alternative_answers'), // JSON array string

  // Short answer
  modelAnswer: text('model_answer'),
  keyPoints:   text('key_points'), // JSON array string

  // Clinical case
  caseScenario:         text('case_scenario'),
  examinationFindings:  text('examination_findings'),
  investigations:       text('investigations'),
  caseQuestion:         text('case_question'),
  caseAnswer:           text('case_answer'),
  caseRationale:        text('case_rationale'),
  teachingPoint:        text('teaching_point'),

  explanation: text('explanation'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const studySessions = sqliteTable('study_sessions', {
  id:              text('id').primaryKey(),
  planId:          text('plan_id'),
  status:          text('status').default('active'), // 'active' | 'completed' | 'abandoned'
  mode:            text('mode').default('practice'),  // 'practice' | 'exam'
  examType:        text('exam_type'),
  timeLimitMins:   integer('time_limit_mins'),
  flaggedQuestions:text('flagged_questions'),          // JSON array of questionIds
  activityTypes:   text('activity_types'), // JSON array
  sourceIds:       text('source_ids'),     // JSON array
  questionIds:     text('question_ids'),   // JSON array (ordered)
  totalQuestions:  integer('total_questions').default(0),
  correctCount:    integer('correct_count').default(0),
  score:           real('score'),
  durationSeconds: integer('duration_seconds').default(0),
  startedAt:       integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt:     integer('completed_at', { mode: 'timestamp' }),
});

export const sessionResponses = sqliteTable('session_responses', {
  id:            text('id').primaryKey(),
  sessionId:     text('session_id').references(() => studySessions.id, { onDelete: 'cascade' }),
  questionId:    text('question_id').references(() => questions.id),
  userAnswer:    text('user_answer'),
  isCorrect:     integer('is_correct', { mode: 'boolean' }),
  aiScore:       real('ai_score'),
  aiFeedback:    text('ai_feedback'),
  timeSpentSecs: integer('time_spent_secs'),
  answeredAt:    integer('answered_at', { mode: 'timestamp' }).notNull(),
});

export const studyPlanItems = sqliteTable('study_plan_items', {
  id:            text('id').primaryKey(),
  planDate:      text('plan_date').notNull(), // 'YYYY-MM-DD'
  title:         text('title').notNull(),
  sourceIds:     text('source_ids').notNull(),     // JSON array
  activityTypes: text('activity_types').notNull(), // JSON array
  questionCount: integer('question_count').default(20),
  isCompleted:   integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt:   integer('completed_at', { mode: 'timestamp' }),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const streakRecords = sqliteTable('streak_records', {
  id:            text('id').primaryKey(),
  studyDate:     text('study_date').notNull(),
  sessionsCount: integer('sessions_count').default(0),
  totalMinutes:  integer('total_minutes').default(0),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  dateUnique: uniqueIndex('streak_date_unique').on(table.studyDate),
}));

export const topicPerformance = sqliteTable('topic_performance', {
  id:              text('id').primaryKey(),
  subject:         text('subject').notNull(),
  topic:           text('topic').notNull(),
  totalAttempts:   integer('total_attempts').default(0),
  correctAttempts: integer('correct_attempts').default(0),
  avgScore:        real('avg_score').default(0),
  lastStudiedAt:   integer('last_studied_at', { mode: 'timestamp' }),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  subjectTopicUnique: uniqueIndex('subject_topic_unique').on(table.subject, table.topic),
}));

export const srCards = sqliteTable('sr_cards', {
  questionId:     text('question_id').primaryKey(),
  easeFactor:     real('ease_factor').notNull().default(2.5),
  interval:       integer('interval').notNull().default(1),
  repetitions:    integer('repetitions').notNull().default(0),
  nextReviewDate: text('next_review_date').notNull(),
  lastReviewDate: text('last_review_date'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const studyGoals = sqliteTable('study_goals', {
  id:                text('id').primaryKey(),
  examType:          text('exam_type'),
  targetExamDate:    text('target_exam_date'),
  weeklyHoursTarget: integer('weekly_hours_target').default(10),
  targetSubjects:    text('target_subjects'),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:         integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userXp = sqliteTable('user_xp', {
  id:        integer('id').primaryKey(),  // always 1 (singleton)
  totalXp:   integer('total_xp').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const examProfiles = sqliteTable('exam_profiles', {
  id:             text('id').primaryKey(),
  name:           text('name').notNull(),
  styleAnalysis:  text('style_analysis').notNull(), // JSON: ExamStyleAnalysis
  rawTextSnippet: text('raw_text_snippet'),           // first 500 chars of the original exam
  questionCount:  integer('question_count').default(0),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const lessons = sqliteTable('lessons', {
  id:               text('id').primaryKey(),
  title:            text('title').notNull(),
  topic:            text('topic').notNull(),
  overview:         text('overview').notNull(),
  sections:         text('sections').notNull(),         // JSON: LessonSection[]
  summary:          text('summary').notNull(),
  clinicalRelevance:text('clinical_relevance').notNull(),
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const summaries = sqliteTable('summaries', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull().default('Untitled Summary'),
  subject:     text('subject'),
  topic:       text('topic'),
  canvasData:  text('canvas_data'),   // base64 PNG of the drawing
  textContent: text('text_content'),  // typed/keyboard text
  aiScore:     integer('ai_score'),   // 0-100
  aiFeedback:  text('ai_feedback'),   // JSON with detailed breakdown
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

export type ContentSource = typeof contentSources.$inferSelect;
export type NewContentSource = typeof contentSources.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
export type SessionResponse = typeof sessionResponses.$inferSelect;
export type NewSessionResponse = typeof sessionResponses.$inferInsert;
export type StudyPlanItem = typeof studyPlanItems.$inferSelect;
export type NewStudyPlanItem = typeof studyPlanItems.$inferInsert;
export type StreakRecord = typeof streakRecords.$inferSelect;
export type TopicPerformance = typeof topicPerformance.$inferSelect;
export type SrCard = typeof srCards.$inferSelect;
export type StudyGoal = typeof studyGoals.$inferSelect;
export type UserXp = typeof userXp.$inferSelect;
export type ExamProfile = typeof examProfiles.$inferSelect;

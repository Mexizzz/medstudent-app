import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── Users ──────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name:         text('name'),
  username:     text('username').unique(),
  bio:          text('bio'),
  avatarUrl:    text('avatar_url'),
  subscriptionTier:    text('subscription_tier').notNull().default('free'), // 'free' | 'pro' | 'max'
  stripeCustomerId:    text('stripe_customer_id'),
  stripeSubscriptionId:text('stripe_subscription_id'),
  subscriptionStatus:  text('subscription_status').default('active'), // 'active' | 'canceled' | 'past_due'
  subscriptionEndsAt:  integer('subscription_ends_at', { mode: 'timestamp' }),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Content (per-user) ───────────────────────────────────
export const contentSources = sqliteTable('content_sources', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').references(() => users.id, { onDelete: 'cascade' }),
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
  difficulty:    text('difficulty').default('medium'),

  question:      text('question'),
  optionA:       text('option_a'),
  optionB:       text('option_b'),
  optionC:       text('option_c'),
  optionD:       text('option_d'),
  correctAnswer: text('correct_answer'),

  front:         text('front'),
  back:          text('back'),
  cardType:      text('card_type'),

  blankText:         text('blank_text'),
  blankAnswer:       text('blank_answer'),
  alternativeAnswers:text('alternative_answers'),

  modelAnswer: text('model_answer'),
  keyPoints:   text('key_points'),

  caseScenario:         text('case_scenario'),
  examinationFindings:  text('examination_findings'),
  investigations:       text('investigations'),
  caseQuestion:         text('case_question'),
  caseAnswer:           text('case_answer'),
  caseRationale:        text('case_rationale'),
  teachingPoint:        text('teaching_point'),

  explanation: text('explanation'),
  imageUrl:    text('image_url'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Per-user tables ────────────────────────────────────
export const studySessions = sqliteTable('study_sessions', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId:          text('plan_id'),
  status:          text('status').default('active'),
  mode:            text('mode').default('practice'),
  examType:        text('exam_type'),
  timeLimitMins:   integer('time_limit_mins'),
  flaggedQuestions:text('flagged_questions'),
  activityTypes:   text('activity_types'),
  sourceIds:       text('source_ids'),
  questionIds:     text('question_ids'),
  totalQuestions:  integer('total_questions').default(0),
  correctCount:    integer('correct_count').default(0),
  score:           real('score'),
  durationSeconds: integer('duration_seconds').default(0),
  startedAt:       integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt:     integer('completed_at', { mode: 'timestamp' }),
});

export const sessionResponses = sqliteTable('session_responses', {
  id:            text('id').primaryKey(),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planDate:      text('plan_date').notNull(),
  title:         text('title').notNull(),
  sourceIds:     text('source_ids').notNull(),
  activityTypes: text('activity_types').notNull(),
  questionCount: integer('question_count').default(20),
  isCompleted:   integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt:   integer('completed_at', { mode: 'timestamp' }),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const streakRecords = sqliteTable('streak_records', {
  id:            text('id').primaryKey(),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studyDate:     text('study_date').notNull(),
  sessionsCount: integer('sessions_count').default(0),
  totalMinutes:  integer('total_minutes').default(0),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  dateUserUnique: uniqueIndex('streak_date_user_unique').on(table.userId, table.studyDate),
}));

export const topicPerformance = sqliteTable('topic_performance', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject:         text('subject').notNull(),
  topic:           text('topic').notNull(),
  totalAttempts:   integer('total_attempts').default(0),
  correctAttempts: integer('correct_attempts').default(0),
  avgScore:        real('avg_score').default(0),
  lastStudiedAt:   integer('last_studied_at', { mode: 'timestamp' }),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userSubjectTopicUnique: uniqueIndex('user_subject_topic_unique').on(table.userId, table.subject, table.topic),
}));

export const srCards = sqliteTable('sr_cards', {
  id:             text('id').primaryKey(),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId:     text('question_id').notNull(),
  easeFactor:     real('ease_factor').notNull().default(2.5),
  interval:       integer('interval').notNull().default(1),
  repetitions:    integer('repetitions').notNull().default(0),
  nextReviewDate: text('next_review_date').notNull(),
  lastReviewDate: text('last_review_date'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userQuestionUnique: uniqueIndex('sr_user_question_unique').on(table.userId, table.questionId),
}));

export const studyGoals = sqliteTable('study_goals', {
  id:                text('id').primaryKey(),
  userId:            text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examType:          text('exam_type'),
  targetExamDate:    text('target_exam_date'),
  weeklyHoursTarget: integer('weekly_hours_target').default(10),
  targetSubjects:    text('target_subjects'),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:         integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userXp = sqliteTable('user_xp', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalXp:   integer('total_xp').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const examProfiles = sqliteTable('exam_profiles', {
  id:             text('id').primaryKey(),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  styleAnalysis:  text('style_analysis').notNull(),
  rawTextSnippet: text('raw_text_snippet'),
  questionCount:  integer('question_count').default(0),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const lessons = sqliteTable('lessons', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:            text('title').notNull(),
  topic:            text('topic').notNull(),
  overview:         text('overview').notNull(),
  sections:         text('sections').notNull(),
  summary:          text('summary').notNull(),
  clinicalRelevance:text('clinical_relevance').notNull(),
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const summaries = sqliteTable('summaries', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       text('title').notNull().default('Untitled Summary'),
  subject:     text('subject'),
  topic:       text('topic'),
  canvasData:  text('canvas_data'),
  textContent: text('text_content'),
  aiScore:     integer('ai_score'),
  aiFeedback:  text('ai_feedback'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ── Study Rooms (collaborative) ──────────────────────
export const studyRooms = sqliteTable('study_rooms', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  joinCode:  text('join_code').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isActive:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const roomMembers = sqliteTable('room_members', {
  id:              text('id').primaryKey(),
  roomId:          text('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName:        text('user_name'),
  isOnline:        integer('is_online', { mode: 'boolean' }).notNull().default(true),
  timerRunning:    integer('timer_running', { mode: 'boolean' }).notNull().default(false),
  timerStartedAt:  integer('timer_started_at', { mode: 'timestamp' }),
  totalStudiedSecs:integer('total_studied_secs').notNull().default(0),
  lastSeenAt:      integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  joinedAt:        integer('joined_at', { mode: 'timestamp' }).notNull(),
  isMicOn:         integer('is_mic_on', { mode: 'boolean' }).notNull().default(false),
  isMutedByAdmin:  integer('is_muted_by_admin', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  roomUserUnique: uniqueIndex('room_user_unique').on(table.roomId, table.userId),
}));

export const voiceSignals = sqliteTable('voice_signals', {
  id:         text('id').primaryKey(),
  roomId:     text('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId:   text('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(), // 'offer' | 'answer' | 'ice-candidate'
  payload:    text('payload').notNull(), // JSON stringified SDP or ICE candidate
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const roomMessages = sqliteTable('room_messages', {
  id:        text('id').primaryKey(),
  roomId:    text('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName:  text('user_name'),
  content:   text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Password Reset Codes ─────────────────────────────
export const passwordResetCodes = sqliteTable('password_reset_codes', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull(),
  code:      text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  used:      integer('used', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Friend Requests ──────────────────────────────────
export const friendRequests = sqliteTable('friend_requests', {
  id:         text('id').primaryKey(),
  fromUserId: text('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId:   text('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status:     text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected'
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  requestUnique: uniqueIndex('friend_request_unique').on(table.fromUserId, table.toUserId),
}));

// ── Friendships ──────────────────────────────────────
export const friendships = sqliteTable('friendships', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendId:  text('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  friendshipUnique: uniqueIndex('friendship_unique').on(table.userId, table.friendId),
}));

// ── Direct Messages ──────────────────────────────────
export const directMessages = sqliteTable('direct_messages', {
  id:         text('id').primaryKey(),
  senderId:   text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content:    text('content').notNull(),
  read:       integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Doctor PDFs (reference material) ─────────────────
export const doctorPdfs = sqliteTable('doctor_pdfs', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  subject:     text('subject'),
  fileName:    text('file_name').notNull(),
  filePath:    text('file_path').notNull(),
  fileSize:    integer('file_size').notNull(),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Question Folders ─────────────────────────────────
export const questionFolders = sqliteTable('question_folders', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  color:     text('color').default('#6366f1'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const folderQuestions = sqliteTable('folder_questions', {
  id:         text('id').primaryKey(),
  folderId:   text('folder_id').notNull().references(() => questionFolders.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  addedAt:    integer('added_at', { mode: 'timestamp' }).notNull(),
});

// ── Usage Tracking (subscription limits) ─────────────
export const usageTracking = sqliteTable('usage_tracking', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action:    text('action').notNull(), // 'question_generate' | 'tutor_message' | 'lesson_generate' | 'summary_evaluate' | 'exam_analyze' | 'exam_generate'
  count:     integer('count').notNull().default(0),
  date:      text('date').notNull(), // 'YYYY-MM-DD'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userActionDateUnique: uniqueIndex('usage_user_action_date').on(table.userId, table.action, table.date),
}));

// ── Support Tickets ───────────────────────────────────
export const supportTickets = sqliteTable('support_tickets', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject:   text('subject').notNull(),
  status:    text('status').notNull().default('open'), // 'open' | 'replied' | 'closed'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const supportMessages = sqliteTable('support_messages', {
  id:        text('id').primaryKey(),
  ticketId:  text('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderId:  text('sender_id').notNull(), // user id or 'admin'
  isAdmin:   integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  message:   text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Feature Requests ──────────────────────────────────
export const featureRequests = sqliteTable('feature_requests', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description').notNull(),
  category:    text('category').notNull().default('feature'), // 'feature' | 'improvement' | 'bug'
  status:      text('status').notNull().default('open'), // 'open' | 'planned' | 'in_progress' | 'done' | 'declined'
  adminNote:   text('admin_note'),
  upvoteCount: integer('upvote_count').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const featureVotes = sqliteTable('feature_votes', {
  id:        text('id').primaryKey(),
  requestId: text('request_id').notNull().references(() => featureRequests.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  uniqueVote: uniqueIndex('vote_request_user_unique').on(table.requestId, table.userId),
}));

// ── Type exports ───────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
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
export type DoctorPdf = typeof doctorPdfs.$inferSelect;
export type StreakRecord = typeof streakRecords.$inferSelect;
export type TopicPerformance = typeof topicPerformance.$inferSelect;
export type SrCard = typeof srCards.$inferSelect;
export type StudyGoal = typeof studyGoals.$inferSelect;
export type QuestionFolder = typeof questionFolders.$inferSelect;
export type FolderQuestion = typeof folderQuestions.$inferSelect;
export type UserXp = typeof userXp.$inferSelect;
export type ExamProfile = typeof examProfiles.$inferSelect;
export type StudyRoom = typeof studyRooms.$inferSelect;
export type RoomMember = typeof roomMembers.$inferSelect;
export type RoomMessage = typeof roomMessages.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;

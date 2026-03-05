CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `name` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS `session_responses`;
--> statement-breakpoint
DROP TABLE IF EXISTS `study_sessions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `study_plan_items`;
--> statement-breakpoint
DROP TABLE IF EXISTS `streak_records`;
--> statement-breakpoint
DROP TABLE IF EXISTS `topic_performance`;
--> statement-breakpoint
DROP TABLE IF EXISTS `sr_cards`;
--> statement-breakpoint
DROP TABLE IF EXISTS `study_goals`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_xp`;
--> statement-breakpoint
DROP TABLE IF EXISTS `exam_profiles`;
--> statement-breakpoint
DROP TABLE IF EXISTS `lessons`;
--> statement-breakpoint
DROP TABLE IF EXISTS `summaries`;
--> statement-breakpoint
CREATE TABLE `study_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `plan_id` text,
  `status` text DEFAULT 'active',
  `mode` text DEFAULT 'practice',
  `exam_type` text,
  `time_limit_mins` integer,
  `flagged_questions` text,
  `activity_types` text,
  `source_ids` text,
  `question_ids` text,
  `total_questions` integer DEFAULT 0,
  `correct_count` integer DEFAULT 0,
  `score` real,
  `duration_seconds` integer DEFAULT 0,
  `started_at` integer NOT NULL,
  `completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `session_responses` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `session_id` text REFERENCES `study_sessions`(`id`) ON DELETE CASCADE,
  `question_id` text REFERENCES `questions`(`id`),
  `user_answer` text,
  `is_correct` integer,
  `ai_score` real,
  `ai_feedback` text,
  `time_spent_secs` integer,
  `answered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_plan_items` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `plan_date` text NOT NULL,
  `title` text NOT NULL,
  `source_ids` text NOT NULL,
  `activity_types` text NOT NULL,
  `question_count` integer DEFAULT 20,
  `is_completed` integer DEFAULT 0,
  `completed_at` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `streak_records` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `study_date` text NOT NULL,
  `sessions_count` integer DEFAULT 0,
  `total_minutes` integer DEFAULT 0,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `streak_date_user_unique` ON `streak_records` (`user_id`, `study_date`);
--> statement-breakpoint
CREATE TABLE `topic_performance` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `subject` text NOT NULL,
  `topic` text NOT NULL,
  `total_attempts` integer DEFAULT 0,
  `correct_attempts` integer DEFAULT 0,
  `avg_score` real DEFAULT 0,
  `last_studied_at` integer,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_subject_topic_unique` ON `topic_performance` (`user_id`, `subject`, `topic`);
--> statement-breakpoint
CREATE TABLE `sr_cards` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `question_id` text NOT NULL,
  `ease_factor` real NOT NULL DEFAULT 2.5,
  `interval` integer NOT NULL DEFAULT 1,
  `repetitions` integer NOT NULL DEFAULT 0,
  `next_review_date` text NOT NULL,
  `last_review_date` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sr_user_question_unique` ON `sr_cards` (`user_id`, `question_id`);
--> statement-breakpoint
CREATE TABLE `study_goals` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `exam_type` text,
  `target_exam_date` text,
  `weekly_hours_target` integer DEFAULT 10,
  `target_subjects` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_xp` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE UNIQUE,
  `total_xp` integer NOT NULL DEFAULT 0,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `style_analysis` text NOT NULL,
  `raw_text_snippet` text,
  `question_count` integer DEFAULT 0,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `topic` text NOT NULL,
  `overview` text NOT NULL,
  `sections` text NOT NULL,
  `summary` text NOT NULL,
  `clinical_relevance` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `summaries` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL DEFAULT 'Untitled Summary',
  `subject` text,
  `topic` text,
  `canvas_data` text,
  `text_content` text,
  `ai_score` integer,
  `ai_feedback` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `content_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`subject` text,
	`topic` text,
	`file_path` text,
	`youtube_url` text,
	`youtube_id` text,
	`raw_text` text,
	`word_count` integer,
	`page_count` integer,
	`status` text DEFAULT 'pending',
	`error_msg` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`type` text NOT NULL,
	`subject` text,
	`topic` text,
	`difficulty` text DEFAULT 'medium',
	`question` text,
	`option_a` text,
	`option_b` text,
	`option_c` text,
	`option_d` text,
	`correct_answer` text,
	`front` text,
	`back` text,
	`card_type` text,
	`blank_text` text,
	`blank_answer` text,
	`alternative_answers` text,
	`model_answer` text,
	`key_points` text,
	`case_scenario` text,
	`examination_findings` text,
	`investigations` text,
	`case_question` text,
	`case_answer` text,
	`case_rationale` text,
	`teaching_point` text,
	`explanation` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `content_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`question_id` text,
	`user_answer` text,
	`is_correct` integer,
	`ai_score` real,
	`ai_feedback` text,
	`time_spent_secs` integer,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `streak_records` (
	`id` text PRIMARY KEY NOT NULL,
	`study_date` text NOT NULL,
	`sessions_count` integer DEFAULT 0,
	`total_minutes` integer DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `streak_date_unique` ON `streak_records` (`study_date`);--> statement-breakpoint
CREATE TABLE `study_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_date` text NOT NULL,
	`title` text NOT NULL,
	`source_ids` text NOT NULL,
	`activity_types` text NOT NULL,
	`question_count` integer DEFAULT 20,
	`is_completed` integer DEFAULT false,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`status` text DEFAULT 'active',
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
CREATE TABLE `topic_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`topic` text NOT NULL,
	`total_attempts` integer DEFAULT 0,
	`correct_attempts` integer DEFAULT 0,
	`avg_score` real DEFAULT 0,
	`last_studied_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_topic_unique` ON `topic_performance` (`subject`,`topic`);
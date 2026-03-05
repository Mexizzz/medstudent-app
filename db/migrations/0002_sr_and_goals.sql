CREATE TABLE IF NOT EXISTS `sr_cards` (
	`question_id` text PRIMARY KEY NOT NULL,
	`ease_factor` real NOT NULL DEFAULT 2.5,
	`interval` integer NOT NULL DEFAULT 1,
	`repetitions` integer NOT NULL DEFAULT 0,
	`next_review_date` text NOT NULL,
	`last_review_date` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `study_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_type` text,
	`target_exam_date` text,
	`weekly_hours_target` integer DEFAULT 10,
	`target_subjects` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `study_sessions` ADD COLUMN `mode` text DEFAULT 'practice';
--> statement-breakpoint
ALTER TABLE `study_sessions` ADD COLUMN `exam_type` text;
--> statement-breakpoint
ALTER TABLE `study_sessions` ADD COLUMN `time_limit_mins` integer;
--> statement-breakpoint
ALTER TABLE `study_sessions` ADD COLUMN `flagged_questions` text;

CREATE TABLE IF NOT EXISTS `exam_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`style_analysis` text NOT NULL,
	`raw_text_snippet` text,
	`question_count` integer DEFAULT 0,
	`created_at` integer NOT NULL
);

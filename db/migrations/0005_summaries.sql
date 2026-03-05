CREATE TABLE IF NOT EXISTS `summaries` (
	`id` text PRIMARY KEY NOT NULL,
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

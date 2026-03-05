CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`topic` text NOT NULL,
	`overview` text NOT NULL,
	`sections` text NOT NULL,
	`summary` text NOT NULL,
	`clinical_relevance` text NOT NULL,
	`created_at` integer NOT NULL
);

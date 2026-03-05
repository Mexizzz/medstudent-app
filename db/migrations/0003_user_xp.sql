CREATE TABLE IF NOT EXISTS `user_xp` (
	`id` integer PRIMARY KEY NOT NULL,
	`total_xp` integer NOT NULL DEFAULT 0,
	`updated_at` integer NOT NULL
);

-- Admin actions: ban users for a window or permanently. Hard delete is on
-- the users table directly (existing FK cascades handle cleanup).
ALTER TABLE users ADD COLUMN banned_until INTEGER;--> statement-breakpoint
ALTER TABLE users ADD COLUMN ban_reason TEXT;

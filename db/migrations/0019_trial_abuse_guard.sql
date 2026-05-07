-- Trial-abuse guard: canonical email + signup IP for dedup and throttling.
ALTER TABLE users ADD COLUMN normalized_email TEXT;--> statement-breakpoint
ALTER TABLE users ADD COLUMN signup_ip TEXT;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_normalized_email_idx ON users(normalized_email);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_signup_ip_idx ON users(signup_ip, created_at);

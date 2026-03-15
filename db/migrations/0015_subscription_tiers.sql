ALTER TABLE users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN subscription_ends_at INTEGER;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS usage_user_action_date ON usage_tracking(user_id, action, date);

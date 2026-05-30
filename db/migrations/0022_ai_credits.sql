-- AI credits: one-time purchase top-ups that kick in when subscription
-- daily limits run out. 1 credit ~= 1 AI request.
ALTER TABLE users ADD COLUMN ai_credits INTEGER NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS credit_tx_user_created ON credit_transactions(user_id, created_at);

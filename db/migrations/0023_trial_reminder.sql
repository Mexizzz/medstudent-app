-- Timestamp of the "your trial ends soon" reminder email, so the daily cron
-- sends it exactly once per user. NULL = not yet reminded.
ALTER TABLE users ADD COLUMN trial_reminder_sent_at INTEGER;

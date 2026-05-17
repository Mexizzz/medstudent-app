-- Cache table for AI generation results. Keyed by sha256(system + userPrompt + maxTokens).
-- Two users uploading the same source and asking for the same generation
-- hit the same key, so we only pay for the first one.
CREATE TABLE IF NOT EXISTS generation_cache (
  cache_key TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  created_at INTEGER NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS generation_cache_created_idx ON generation_cache(created_at);

ALTER TABLE room_members ADD COLUMN is_mic_on INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE room_members ADD COLUMN is_muted_by_admin INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS voice_signals (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS voice_signals_room_to ON voice_signals(room_id, to_user_id, created_at);

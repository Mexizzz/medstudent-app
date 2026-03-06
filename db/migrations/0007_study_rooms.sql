CREATE TABLE IF NOT EXISTS study_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  is_online INTEGER NOT NULL DEFAULT 1,
  timer_running INTEGER NOT NULL DEFAULT 0,
  timer_started_at INTEGER,
  total_studied_secs INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL,
  joined_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS room_user_unique ON room_members(room_id, user_id);

CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN bio TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN avatar_url TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS friend_request_unique ON friend_requests(from_user_id, to_user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS friendship_unique ON friendships(user_id, friend_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

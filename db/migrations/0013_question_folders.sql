CREATE TABLE IF NOT EXISTS question_folders (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folder_questions (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES question_folders(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  added_at    INTEGER NOT NULL
);

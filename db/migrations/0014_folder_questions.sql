CREATE TABLE IF NOT EXISTS folder_questions (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES question_folders(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  added_at    INTEGER NOT NULL
);

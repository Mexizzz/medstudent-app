import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR || process.cwd();

// Ensure data directory exists (for Railway volumes)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medstudent.db');

const sqlite = new Database(dbPath);

// Allow up to 10s of retries before throwing SQLITE_BUSY
// (Railway build spawns 47 parallel workers that all open the same db file)
sqlite.pragma('busy_timeout = 10000');
// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };

// Run migrations only at runtime, not during `next build`
// (build spawns 47 parallel workers that would all lock the same SQLite file)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });
  } catch (e) {
    console.error('Drizzle migrate error:', e);
  }
  // Safety net: add image_url column if migration was previously missed
  try { sqlite.exec('ALTER TABLE questions ADD COLUMN image_url TEXT'); } catch { /* already exists */ }
  // Create focus_sessions table for Study Space feature
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_heartbeat_at INTEGER,
      ended_at INTEGER,
      total_seconds INTEGER NOT NULL DEFAULT 0
    )`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS focus_user_started ON focus_sessions(user_id, started_at)`);
  } catch { /* already exists */ }

  // Study Space feature extensions
  const addCol = (table: string, col: string, type: string) => {
    try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch { /* already exists */ }
  };
  addCol('focus_sessions', 'topic', 'TEXT');
  addCol('focus_sessions', 'subject', 'TEXT');
  addCol('focus_sessions', 'goal_seconds', 'INTEGER');
  addCol('focus_sessions', 'pomodoro', 'INTEGER DEFAULT 0');
  addCol('focus_sessions', 'pomodoro_work', 'INTEGER DEFAULT 1500');
  addCol('focus_sessions', 'pomodoro_break', 'INTEGER DEFAULT 300');
  addCol('focus_sessions', 'distraction_seconds', 'INTEGER DEFAULT 0');
  addCol('focus_sessions', 'correct_quizzes', 'INTEGER DEFAULT 0');
  addCol('focus_sessions', 'total_quizzes', 'INTEGER DEFAULT 0');
  addCol('focus_sessions', 'notes', 'TEXT');
  addCol('focus_sessions', 'summary', 'TEXT');
  addCol('focus_sessions', 'room_id', 'TEXT');

  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_stats (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_study_date TEXT,
      freeze_tokens INTEGER NOT NULL DEFAULT 1,
      total_xp INTEGER NOT NULL DEFAULT 0,
      total_seconds INTEGER NOT NULL DEFAULT 0
    )`);
    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL,
      UNIQUE(user_id, code)
    )`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS focus_ach_user ON focus_achievements(user_id)`);

    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      host_user_id TEXT NOT NULL,
      max_members INTEGER NOT NULL DEFAULT 8,
      body_double INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`);
    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_room_members (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id)
    )`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS focus_room_mem_user ON focus_room_members(user_id)`);

    sqlite.exec(`CREATE TABLE IF NOT EXISTS focus_challenges (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      target_seconds INTEGER NOT NULL,
      starts_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS focus_chal_to ON focus_challenges(to_user_id, status)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS focus_chal_from ON focus_challenges(from_user_id, status)`);
  } catch (e) { console.error('Study Space schema error:', e); }

  // PDF Summary + Chat Refine
  try {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS source_summaries (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      messages TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(source_id, user_id)
    )`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS source_summaries_user ON source_summaries(user_id)`);
  } catch (e) { console.error('source_summaries schema error:', e); }
}

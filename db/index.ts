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
}

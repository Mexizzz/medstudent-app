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

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };

// Auto-run migrations on startup
try {
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });
} catch (e) {
  // Migrations already applied — ignore
}

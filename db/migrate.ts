import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR || process.cwd();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medstudent.db');

try {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });
  console.log('✅ Database migrations complete');
  sqlite.close();
} catch (e) {
  console.error('Migration failed, resetting database...', e);
  // Delete corrupt/partial DB and retry
  try { fs.unlinkSync(dbPath); } catch {}
  try { fs.unlinkSync(dbPath + '-shm'); } catch {}
  try { fs.unlinkSync(dbPath + '-wal'); } catch {}
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') });
  console.log('✅ Database migrations complete (after reset)');
  sqlite.close();
}

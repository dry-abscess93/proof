/**
 * SQLite DB 연결 (MVP)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SCHEMA_SQL } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/proof.db');

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_SQL);

    // Migration: source_type 컬럼 추가 (기존 DB 호환)
    const columns = db.prepare("PRAGMA table_info(decision_events)").all() as { name: string }[];
    if (!columns.some(c => c.name === 'source_type')) {
      db.exec("ALTER TABLE decision_events ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'");
      db.exec("CREATE INDEX IF NOT EXISTS idx_decision_events_source ON decision_events(source_type)");
    }
  }
  return db;
}

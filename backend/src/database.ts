import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DB_PATH || join(__dirname, '../../data/outbound.db');

// Ensure directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

export function initDatabase() {
  console.log('📦 Initializing database...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Prospects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      industry TEXT,
      company_size INTEGER,
      status TEXT DEFAULT 'new',
      research_data TEXT,
      success_probability INTEGER,
      custom_instructions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add custom_instructions column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE prospects ADD COLUMN custom_instructions TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Calls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      prospect_id TEXT NOT NULL,
      call_type TEXT DEFAULT 'voice',
      status TEXT DEFAULT 'pending',
      conversation TEXT,
      outcome TEXT,
      meeting_booked INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      sentiment_score REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    )
  `);

  // Add call_type column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN call_type TEXT DEFAULT 'voice'`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Campaigns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      target_count INTEGER DEFAULT 0,
      completed_count INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Meetings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      prospect_id TEXT NOT NULL,
      call_id TEXT,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      meeting_type TEXT DEFAULT 'demo',
      status TEXT DEFAULT 'scheduled',
      account_manager_name TEXT,
      account_manager_email TEXT,
      notes TEXT,
      calendar_link TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id),
      FOREIGN KEY (call_id) REFERENCES calls(id)
    )
  `);

  console.log('✓ Database initialized');
}

export function getDb() {
  return db;
}

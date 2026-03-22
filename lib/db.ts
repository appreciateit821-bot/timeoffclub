// Cloudflare D1 Database Layer
// @cloudflare/next-on-pages 의 getRequestContext로 D1 접근

import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDB(): D1Database | null {
  try {
    const { env } = getRequestContext();
    return (env as any).DB;
  } catch {
    return null;
  }
}

let initialized = false;

export async function initDB() {
  const db = getDB();
  if (!db || initialized) return;
  initialized = true;

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, is_admin INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone_last4 TEXT NOT NULL, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(name, phone_last4)
    )`,
    `CREATE TABLE IF NOT EXISTS spot_operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, spot_id TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, date TEXT NOT NULL, spot TEXT NOT NULL,
      check_in_status TEXT DEFAULT 'unchecked', checked_at DATETIME, checked_by TEXT,
      confirmed INTEGER DEFAULT 0, confirmed_at DATETIME, mode TEXT DEFAULT 'smalltalk',
      memo TEXT DEFAULT '', energy TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_name, date)
    )`,
    `CREATE TABLE IF NOT EXISTS reservation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, date TEXT NOT NULL, spot TEXT, action TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, date TEXT NOT NULL, spot TEXT NOT NULL,
      position INTEGER DEFAULT 0, is_notified INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_name, date, spot)
    )`,
    `CREATE TABLE IF NOT EXISTS noshow_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, warning_level INTEGER DEFAULT 1, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS trial_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT, phone_last4 TEXT,
      is_used INTEGER DEFAULT 0, used_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, date TEXT NOT NULL, spot TEXT NOT NULL,
      service_rating INTEGER DEFAULT 0, service_feedback TEXT, person_issue TEXT, general_comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS session_moments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_name TEXT NOT NULL, date TEXT NOT NULL, spot TEXT NOT NULL,
      moment_text TEXT NOT NULL, is_anonymous INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_name, date, spot)
    )`
  ];

  for (const sql of tables) {
    await db.exec(sql);
  }

  // 스팟 운영자 초기 데이터
  const operators = [
    ['약수_스티키플로어', '약수_스티키플로어', 'yaksu2026'],
    ['망원_다시점', '망원_다시점', 'mangwon2026'],
    ['압구정로데오_벤슨 테이스팅 라운지', '압구정로데오_벤슨 테이스팅 라운지', 'apgujeong2026'],
    ['서촌_터틀도브', '서촌_터틀도브', 'seochon2026']
  ];

  for (const [name, spotId, password] of operators) {
    await db.prepare('INSERT OR IGNORE INTO spot_operators (name, spot_id, password) VALUES (?, ?, ?)').bind(name, spotId, password).run();
  }
}

// D1 type declaration
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<any>;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(colName?: string): Promise<any>;
  all(): Promise<{ results: any[] }>;
  run(): Promise<any>;
}

export default { getDB, initDB };

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'timeoff.db');
const db = new Database(dbPath);

// 데이터베이스 초기화
export function initDB() {
  // 사용자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 멤버 테이블 (일반 멤버 관리)
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_last4 TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, phone_last4)
    )
  `);

  // 스팟 운영자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS spot_operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      spot_id TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 예약 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL,
      spot TEXT NOT NULL,
      check_in_status TEXT DEFAULT 'unchecked',
      checked_at DATETIME,
      checked_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_name, date),
      FOREIGN KEY (user_name) REFERENCES users(name)
    )
  `);

  // 기존 테이블에 체크인 컬럼 없으면 추가
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN check_in_status TEXT DEFAULT 'unchecked'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN checked_at DATETIME`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN checked_by TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN confirmed INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN confirmed_at DATETIME`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN mode TEXT DEFAULT 'smalltalk'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN memo TEXT DEFAULT ''`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE reservations ADD COLUMN energy TEXT DEFAULT 'normal'`);
  } catch (e) {}

  // 세션 후 한마디 (익명)
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_moments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL,
      spot TEXT NOT NULL,
      moment_text TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_name, date, spot)
    )
  `);

  // 예약 로그 테이블 (변경/취소 이력)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL,
      spot TEXT,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 대기자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL,
      spot TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      is_notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_name, date, spot)
    )
  `);

  // 노쇼 경고 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS noshow_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      warning_level INTEGER DEFAULT 1,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 체험권 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS trial_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT,
      phone_last4 TEXT,
      is_used INTEGER DEFAULT 0,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 피드백 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL,
      spot TEXT NOT NULL,
      service_rating INTEGER DEFAULT 0,
      service_feedback TEXT,
      person_issue TEXT,
      general_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
    CREATE INDEX IF NOT EXISTS idx_reservations_spot ON reservations(spot);
    CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_name);
    CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
    CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);
  `);

  // 스팟 운영자 초기 데이터 삽입
  const spotOperators = [
    { name: '약수_스티키플로어', spot_id: '약수_스티키플로어', password: 'yaksu2026' },
    { name: '망원_다시점', spot_id: '망원_다시점', password: 'mangwon2026' },
    { name: '압구정로데오_벤슨 테이스팅 라운지', spot_id: '압구정로데오_벤슨 테이스팅 라운지', password: 'apgujeong2026' },
    { name: '서촌_터틀도브', spot_id: '서촌_터틀도브', password: 'seochon2026' }
  ];

  const insertOperator = db.prepare(`
    INSERT OR IGNORE INTO spot_operators (name, spot_id, password)
    VALUES (?, ?, ?)
  `);

  for (const operator of spotOperators) {
    insertOperator.run(operator.name, operator.spot_id, operator.password);
  }
}

export default db;

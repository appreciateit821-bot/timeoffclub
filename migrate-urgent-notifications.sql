-- 긴급 인앱 알림 테이블 생성
CREATE TABLE IF NOT EXISTS urgent_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  FOREIGN KEY (member_name) REFERENCES members(name)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_member ON urgent_notifications(member_name);
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_expires ON urgent_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_read ON urgent_notifications(is_read);
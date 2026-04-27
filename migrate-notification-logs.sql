-- 알림 발송 기록 (중복 발송 방지용 dedup 테이블)
CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  spot TEXT NOT NULL,
  member_name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, spot, member_name, notification_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_lookup
  ON notification_logs(date, spot, notification_type);

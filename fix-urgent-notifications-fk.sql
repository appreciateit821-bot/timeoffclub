-- urgent_notifications 테이블의 잘못된 FK 제거
-- 원인: FOREIGN KEY (member_name) REFERENCES members(name) — members.name이 UNIQUE가 아니어서 스키마 유효하지 않음

-- 1. 새 테이블 생성 (FK 없이)
CREATE TABLE urgent_notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_read INTEGER DEFAULT 0
);

-- 2. 기존 데이터 복사
INSERT INTO urgent_notifications_new (id, member_name, title, content, created_at, expires_at, is_read)
SELECT id, member_name, title, content, created_at, expires_at, is_read FROM urgent_notifications;

-- 3. 기존 테이블 삭제
DROP TABLE urgent_notifications;

-- 4. 새 테이블 이름 변경
ALTER TABLE urgent_notifications_new RENAME TO urgent_notifications;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_member ON urgent_notifications(member_name);
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_expires ON urgent_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_urgent_notifications_read ON urgent_notifications(is_read);

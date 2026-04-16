-- 자가 가입 온보딩을 위한 members 테이블 확장
-- 기존 멤버는 approval_status='approved'로 유지, 신규 가입자는 'pending'

ALTER TABLE members ADD COLUMN phone TEXT;
ALTER TABLE members ADD COLUMN email TEXT;
ALTER TABLE members ADD COLUMN age_gender TEXT;
ALTER TABLE members ADD COLUMN occupation TEXT;
ALTER TABLE members ADD COLUMN self_intro TEXT;
ALTER TABLE members ADD COLUMN reasons TEXT;
ALTER TABLE members ADD COLUMN expectation TEXT;
ALTER TABLE members ADD COLUMN smartstore_order_id TEXT;
ALTER TABLE members ADD COLUMN approval_status TEXT DEFAULT 'approved';
ALTER TABLE members ADD COLUMN onboarded_at DATETIME;
ALTER TABLE members ADD COLUMN agreements_at DATETIME;
ALTER TABLE members ADD COLUMN rejected_reason TEXT;

-- 기존 멤버 모두 approved로 마킹 (데이터 일관성)
UPDATE members SET approval_status = 'approved' WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_approval_status ON members(approval_status);
CREATE INDEX IF NOT EXISTS idx_members_smartstore_order ON members(smartstore_order_id);

-- 멤버 뱃지 시스템 테이블 추가

-- 멤버별 뱃지 획득 현황
CREATE TABLE IF NOT EXISTS member_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_name TEXT NOT NULL,
  badge_type TEXT NOT NULL, -- 'explorer', 'adventurer', 'master', 'collector', 'first_timer', 'regular', 'consistent', 'social', 'meditation'
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_name, badge_type)
);

-- 멤버별 스팟 방문 통계 (캐싱용)
CREATE TABLE IF NOT EXISTS member_spot_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_name TEXT NOT NULL,
  spot TEXT NOT NULL,
  visit_count INTEGER DEFAULT 0,
  first_visit_date TEXT,
  last_visit_date TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_name, spot)
);

-- 기존 reservations 테이블에 badge_checked 컬럼 추가 (중복 체크 방지)
ALTER TABLE reservations ADD COLUMN badge_checked INTEGER DEFAULT 0;

-- 뱃지 종류와 조건 정의 (참고용 주석)
/*
뱃지 타입별 조건:
- explorer: 2개 스팟 방문
- adventurer: 3개 스팟 방문  
- master: 4개 스팟 모두 방문
- collector: 각 스팟 3회씩 방문
- first_timer: 첫 타임오프 완료
- regular: 한 스팟 5회 방문
- consistent: 3개월 연속 참여 
- social: 스몰토크 모드 10회
- meditation: 사색 모드 10회
*/
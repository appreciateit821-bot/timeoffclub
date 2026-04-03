-- 대화 열기 기능을 위한 conversation_topics 테이블 생성

CREATE TABLE IF NOT EXISTS conversation_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- 세션 날짜 (YYYY-MM-DD)
    spot TEXT NOT NULL, -- 스팟 ID
    topic TEXT NOT NULL, -- 대화 주제 (최대 30자)
    category TEXT, -- 주제 카테고리 (nullable, 직접 작성 시 null)
    created_by TEXT NOT NULL, -- 주제를 연 멤버 이름
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, spot) -- 한 세션(날짜+스팟)에 주제 1개만
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_conversation_topics_date ON conversation_topics(date);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_date_spot ON conversation_topics(date, spot);
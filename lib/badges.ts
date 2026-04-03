import { SPOTS } from './constants';

// 뱃지 체크 및 부여 로직
export async function checkAndAwardBadges(db: any, userName: string) {
  // 1. 스팟 방문 통계 업데이트
  await updateSpotStats(db, userName);
  
  // 2. 각 뱃지 조건 체크
  await checkFirstTimer(db, userName);
  await checkSpotExploration(db, userName);
  await checkModeSpecialist(db, userName);
}

async function updateSpotStats(db: any, userName: string) {
  const { results: reservations } = await db.prepare('SELECT spot, date, mode FROM reservations WHERE user_name = ?').bind(userName).all();
  
  for (const spot of SPOTS) {
    const spotReservations = (reservations as any[]).filter(r => r.spot === spot);
    if (spotReservations.length === 0) continue;
    
    const visitCount = spotReservations.length;
    const firstVisit = spotReservations.sort((a, b) => a.date.localeCompare(b.date))[0].date;
    const lastVisit = spotReservations.sort((a, b) => b.date.localeCompare(a.date))[0].date;
    
    await db.prepare(`
      INSERT OR REPLACE INTO member_spot_stats 
      (member_name, spot, visit_count, first_visit_date, last_visit_date, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userName, spot, visitCount, firstVisit, lastVisit).run();
  }
}

async function checkFirstTimer(db: any, userName: string) {
  const hasFirstTimer = await db.prepare('SELECT 1 FROM member_badges WHERE member_name = ? AND badge_type = ?').bind(userName, 'first_timer').first();
  if (hasFirstTimer) return;
  
  const firstReservation = await db.prepare('SELECT 1 FROM reservations WHERE user_name = ? LIMIT 1').bind(userName).first();
  if (firstReservation) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'first_timer').run();
  }
}

async function checkSpotExploration(db: any, userName: string) {
  const { results: spotStats } = await db.prepare('SELECT COUNT(DISTINCT spot) as unique_spots FROM member_spot_stats WHERE member_name = ? AND visit_count > 0').bind(userName).all();
  const uniqueSpots = (spotStats as any)[0]?.unique_spots || 0;
  
  // 탐험가 (2개 스팟)
  if (uniqueSpots >= 2) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'explorer').run();
  }
  
  // 모험가 (3개 스팟)  
  if (uniqueSpots >= 3) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'adventurer').run();
  }
  
  // 마스터 (4개 스팟 모두)
  if (uniqueSpots >= 4) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'master').run();
  }
  
  // 컬렉터 (각 스팟 3회씩)
  const { results: collectorCheck } = await db.prepare('SELECT COUNT(*) as spots_with_3_plus FROM member_spot_stats WHERE member_name = ? AND visit_count >= 3').bind(userName).all();
  if ((collectorCheck as any)[0]?.spots_with_3_plus >= 4) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'collector').run();
  }
  
  // 단골 (한 스팟 5회)
  const regularSpot = await db.prepare('SELECT 1 FROM member_spot_stats WHERE member_name = ? AND visit_count >= 5 LIMIT 1').bind(userName).first();
  if (regularSpot) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'regular').run();
  }
}

async function checkModeSpecialist(db: any, userName: string) {
  // 소셜 (스몰토크 10회)
  const socialCount = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND mode = 'smalltalk'").bind(userName).first() as any;
  if (socialCount?.count >= 10) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'social').run();
  }
  
  // 명상가 (사색 10회)
  const meditationCount = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND mode = 'reflection'").bind(userName).first() as any;
  if (meditationCount?.count >= 10) {
    await db.prepare('INSERT OR IGNORE INTO member_badges (member_name, badge_type) VALUES (?, ?)').bind(userName, 'meditation').run();
  }
}

// 고아 대화 주제 자동 정리
export async function cleanupOrphanedTopics(db: any, date: string) {
  try {
    // 해당 날짜의 모든 대화 주제 조회
    const { results: topics } = await db.prepare('SELECT * FROM conversation_topics WHERE date = ?').bind(date).all();
    
    for (const topic of topics as any[]) {
      // 해당 스팟에 스몰토크 예약자가 있는지 확인
      const smalltalkCount = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ? AND mode != ?').bind(date, topic.spot, 'reflection').first() as any;
      
      if ((smalltalkCount?.count || 0) === 0) {
        // 스몰토크 예약자가 0명이면 고아 주제로 간주하고 삭제
        await db.prepare('DELETE FROM conversation_topics WHERE id = ?').bind(topic.id).run();
        console.log(`Cleaned up orphaned topic: ${topic.topic} for ${topic.spot}`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned topics:', error);
    throw error;
  }
}
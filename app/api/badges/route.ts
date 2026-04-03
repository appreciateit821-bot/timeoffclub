import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { SPOTS } from '@/lib/constants';

export const runtime = 'edge';

// 뱃지 정의
const BADGES = {
  first_timer: { name: '🌟 첫 방문', description: '첫 타임오프 완료' },
  explorer: { name: '🥉 탐험가', description: '2개 스팟 방문' },
  adventurer: { name: '🥈 모험가', description: '3개 스팟 방문' },
  master: { name: '🥇 마스터', description: '4개 스팟 모두 방문' },
  collector: { name: '💎 컬렉터', description: '각 스팟 3회씩 방문' },
  regular: { name: '🔥 단골', description: '한 스팟 5회 방문' },
  consistent: { name: '🗓️ 꾸준히', description: '3개월 연속 참여' },
  social: { name: '🤝 소셜', description: '스몰토크 모드 10회' },
  meditation: { name: '🧘 명상가', description: '사색 모드 10회' }
};

export async function GET(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  try {
    // 멤버 뱃지 조회
    const { results: badges } = await db.prepare('SELECT * FROM member_badges WHERE member_name = ? ORDER BY earned_at DESC').bind(user.name).all();
    
    // 스팟 방문 통계 조회
    const { results: spotStats } = await db.prepare('SELECT * FROM member_spot_stats WHERE member_name = ?').bind(user.name).all();
    
    // 전체 예약 통계
    const totalReservations = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE user_name = ?').bind(user.name).first() as any;
    const modeStats = await db.prepare("SELECT mode, COUNT(*) as count FROM reservations WHERE user_name = ? AND mode IN ('smalltalk', 'reflection') GROUP BY mode").bind(user.name).all() as any;
    
    // 뱃지 정보와 함께 반환
    const badgesWithInfo = (badges as any[]).map(badge => ({
      ...badge,
      ...BADGES[badge.badge_type as keyof typeof BADGES]
    }));

    return NextResponse.json({
      badges: badgesWithInfo,
      spotStats,
      totalReservations: totalReservations?.count || 0,
      modeStats: modeStats.results || [],
      availableBadges: BADGES
    });
  } catch (error) {
    console.error('Get badges error:', error);
    return NextResponse.json({ error: '뱃지 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 뱃지 체크 및 자동 부여 함수
export async function POST(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user?.isAdmin || !db) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  try {
    const { memberName } = await request.json();
    const targetUser = memberName || user.name;
    
    await checkAndAwardBadges(db, targetUser);
    
    return NextResponse.json({ success: true, message: '뱃지가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Badge check error:', error);
    return NextResponse.json({ error: '뱃지 체크 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

import { checkAndAwardBadges } from '@/lib/badges';

// 뱃지 체크 및 부여 로직은 lib/badges.ts로 이동
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) {
    return NextResponse.json({ showBanner: false });
  }

  // 오늘 날짜 (KST)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
  const today = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
  const currentHour = kst.getHours();
  const currentMinute = kst.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const dayOfWeek = kst.getDay(); // 0=일요일, 3=수요일
  
  // 세션이 있는 날인지 먼저 확인 (수요일, 일요일만)
  if (dayOfWeek !== 0 && dayOfWeek !== 3) {
    // 세션이 없는 날 (월,화,목,금,토)
    return NextResponse.json({ showBanner: false });
  }
  
  // 요일별 세션 시작 시간
  let sessionStartMinutes;
  if (dayOfWeek === 0) { // 일요일
    sessionStartMinutes = 15 * 60; // 15:00 = 900분
  } else if (dayOfWeek === 3) { // 수요일
    sessionStartMinutes = 20 * 60; // 20:00 = 1200분
  } else {
    // 예기치 못한 경우 (이미 위에서 처리했지만 안전 처리)
    return NextResponse.json({ showBanner: false });
  }
  
  const registrationDeadlineMinutes = sessionStartMinutes - 120; // 2시간 전

  try {
    // 세션이 있는 날인지는 이미 요일 체크로 확인했으므로 session_capacity 체크는 생략
    // (수요일 20:00, 일요일 15:00만 세션이 있음)

    // 1. 사용자가 타겟 조건에 맞는지 확인 (4월 활성 멤버, 체험권 제외)
    const currentMonth = today.substring(0, 7); // '2026-04'
    
    const { results: userCheck } = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM members m 
      WHERE m.name = ?
      AND m.is_active = 1
      AND m.active_months LIKE '%' || ? || '%'
      AND m.name NOT IN (
        SELECT COALESCE(t.name, '') 
        FROM trial_tickets t 
        WHERE t.name IS NOT NULL
      )
    `).bind(session.name, currentMonth).all();

    const isTargetUser = (userCheck[0] as any)?.count > 0;
    if (!isTargetUser) {
      return NextResponse.json({ showBanner: false });
    }

    // 2. 시간대별 메시지 결정
    let bannerData = { showBanner: false, title: '', body: '', type: 'info' };

    // 마감 시간 표시용 문자열
    const deadlineHour = Math.floor(registrationDeadlineMinutes / 60);
    const deadlineDisplay = `${deadlineHour}:00`;
    const sessionStartHour = Math.floor(sessionStartMinutes / 60);
    const sessionStartDisplay = `${sessionStartHour}:00`;
    
    if (currentTimeInMinutes < registrationDeadlineMinutes) {
      // 마감 전: 예약 가능
      bannerData = {
        showBanner: true,
        title: '오늘은 타임오프클럽이 있는 날이에요 🚀',
        body: `시작 2시간 전(${deadlineDisplay})까지 예약/변경이 가능합니다`,
        type: 'info'
      };
    } else if (currentTimeInMinutes < sessionStartMinutes) {
      // 마감 후~시작 전: 마감
      bannerData = {
        showBanner: true,
        title: '오늘 타임오프클럽 예약이 마감되었습니다',
        body: `다음 세션(${dayOfWeek === 0 ? '수요일' : '일요일'})을 기대해주세요!`,
        type: 'warning'
      };
    }
    // 20:00 이후는 showBanner: false (기본값)

    return NextResponse.json(bannerData);
    
  } catch (error) {
    console.error('Banner notification error:', error);
    return NextResponse.json({ showBanner: false });
  }
}
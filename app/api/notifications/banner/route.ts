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
    // 1. 오늘 이 멤버가 예약했는지 확인
    const reservation = await db.prepare(
      `SELECT id, spot FROM reservations WHERE user_name = ? AND date = ?`
    ).bind(session.name, today).first() as any;

    // 예약하지 않은 멤버에게는 배너 표시 안 함
    if (!reservation) {
      return NextResponse.json({ showBanner: false });
    }

    const spotName = reservation.spot.split('_')[1] || reservation.spot;

    // 2. 시간대별 메시지 결정
    let bannerData = { showBanner: false, title: '', body: '', type: 'info', dismissible: true };

    const sessionStartHour = Math.floor(sessionStartMinutes / 60);

    if (currentTimeInMinutes < registrationDeadlineMinutes) {
      // 마감 전
      bannerData = {
        showBanner: true,
        title: `🌿 오늘 ${sessionStartHour === 20 ? '저녁' : '오후'} ${sessionStartHour}시 타임오프클럽`,
        body: `${spotName}에서 만나요! 변경은 2시간 전까지 가능합니다.`,
        type: 'info',
        dismissible: true
      };
    } else if (currentTimeInMinutes < sessionStartMinutes) {
      // 마감 후~시작 전
      bannerData = {
        showBanner: true,
        title: `🌿 오늘 ${sessionStartHour === 20 ? '저녁' : '오후'} ${sessionStartHour}시 타임오프클럽`,
        body: `${spotName}에서 만나요! 예약이 확정되었습니다.`,
        type: 'info',
        dismissible: true
      };
    }
    // 세션 시작 이후는 showBanner: false (기본값)

    return NextResponse.json(bannerData);
    
  } catch (error) {
    console.error('Banner notification error:', error);
    return NextResponse.json({ showBanner: false });
  }
}
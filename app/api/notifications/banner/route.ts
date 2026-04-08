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
  
  // 세션 시작 시간 (20:00 = 1200분)
  const sessionStartMinutes = 20 * 60; // 1200분
  const registrationDeadlineMinutes = sessionStartMinutes - 120; // 18:00 = 1080분

  try {
    // 1. 오늘 세션이 있는지 확인
    const { results: sessions } = await db.prepare(
      'SELECT COUNT(*) as count FROM session_capacity WHERE date = ?'
    ).bind(today).all();

    const hasSession = (sessions[0] as any)?.count > 0;
    if (!hasSession) {
      return NextResponse.json({ showBanner: false });
    }

    // 2. 사용자가 타겟 조건에 맞는지 확인 (4월 활성 멤버, 체험권 제외)
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

    // 3. 시간대별 메시지 결정
    let bannerData = { showBanner: false, title: '', body: '', type: 'info' };

    if (currentTimeInMinutes < registrationDeadlineMinutes) {
      // 18:00 전: 예약 가능
      bannerData = {
        showBanner: true,
        title: '오늘은 타임오프클럽이 있는 날이에요 🚀',
        body: '시작 2시간 전까지 예약/변경이 가능합니다',
        type: 'info'
      };
    } else if (currentTimeInMinutes < sessionStartMinutes) {
      // 18:00~20:00: 마감
      bannerData = {
        showBanner: true,
        title: '오늘 타임오프클럽 예약이 마감되었습니다',
        body: '다음 세션을 기대해주세요!',
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
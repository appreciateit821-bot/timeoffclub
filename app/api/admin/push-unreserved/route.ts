import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { date, title, body, targetSpot } = await request.json();
  if (!date || !body) {
    return NextResponse.json({ error: '날짜와 메시지 필요' }, { status: 400 });
  }

  // 현재 월 추출 (YYYY-MM 형식)
  const currentMonth = date.substring(0, 7); // '2026-04-08' -> '2026-04'
  
  // 해당 날짜 미예약자 중 활성 멤버만 조회 (체험권 제외)
  const { results: unreservedMembers } = await db.prepare(`
    SELECT m.name 
    FROM members m 
    WHERE m.is_active = 1
    AND m.active_months LIKE '%' || ? || '%'
    AND m.name NOT IN (
      SELECT r.user_name 
      FROM reservations r 
      WHERE r.date = ?
    )
    AND m.name NOT IN (
      SELECT t.name 
      FROM trial_tickets t 
      WHERE t.name IS NOT NULL
    )
    ORDER BY m.name
  `).bind(currentMonth, date).all();

  if (unreservedMembers.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: '미예약자 없음', 
      sent: 0 
    });
  }

  // 각 미예약자에게 알림 생성
  let sent = 0;
  for (const member of unreservedMembers as any[]) {
    try {
      await db.prepare(`
        INSERT INTO notifications (user_name, title, body, type, date, spot) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        member.name,
        title || '🌿 오늘 타임오프클럽은 어때요?',
        body,
        'marketing',
        date,
        targetSpot || null
      ).run();
      sent++;
    } catch (e) {
      console.error('알림 생성 실패:', e);
    }
  }

  return NextResponse.json({ 
    success: true, 
    total: unreservedMembers.length,
    sent,
    members: unreservedMembers.slice(0, 5).map((m: any) => m.name)
  });
}
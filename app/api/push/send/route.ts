import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// 리마인더 발송: 세션 5시간 전 예약자에게 알림 생성
// cron job이나 관리자가 호출
export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { date } = await request.json();
  if (!date) return NextResponse.json({ error: '날짜 필요' }, { status: 400 });

  // 해당 날짜 예약자 전원에게 알림 생성
  const { results: reservations } = await db.prepare(
    'SELECT user_name, spot, mode FROM reservations WHERE date = ?'
  ).bind(date).all();

  let created = 0;
  for (const r of reservations as any[]) {
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO notifications (user_name, title, body, type, date, spot) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        r.user_name,
        '🌿 오늘 타임오프클럽이 있어요!',
        `${r.spot}에서 ${r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'} 예정이에요. 변경/취소는 세션 2시간 전까지 가능합니다.`,
        'reminder',
        date,
        r.spot
      ).run();
      created++;
    } catch (e) {}
  }

  return NextResponse.json({ success: true, created, total: reservations.length });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

const CRON_SECRET = 'timeoff-cron-2026';

export async function POST(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });

  const body = await request.json();
  const { date, cronKey } = body;

  // 관리자 또는 cron key로 인증
  const session = await getSession();
  const isAdmin = session?.isAdmin;
  const isCron = cronKey === CRON_SECRET;
  if (!isAdmin && !isCron) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  // 날짜 자동 감지 (cron에서 호출 시)
  const targetDate = date || getTodayKST();

  // 해당 날짜 예약자 전원에게 알림 생성
  const { results: reservations } = await db.prepare(
    'SELECT user_name, spot, mode FROM reservations WHERE date = ?'
  ).bind(targetDate).all();

  if (reservations.length === 0) {
    return NextResponse.json({ success: true, message: '해당 날짜 예약 없음', created: 0 });
  }

  let created = 0;
  for (const r of reservations as any[]) {
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO notifications (user_name, title, body, type, date, spot) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        r.user_name,
        '🌿 오늘 타임오프클럽이 있어요!',
        `${r.spot.split('_')[1] || r.spot}에서 ${r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'} 예정이에요. 멤버들이 기다리고 있으니 정시 참석 부탁드려요❤️`,
        'reminder',
        targetDate,
        r.spot
      ).run();
      created++;
    } catch (e) {}
  }

  return NextResponse.json({ success: true, created, total: reservations.length });
}

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

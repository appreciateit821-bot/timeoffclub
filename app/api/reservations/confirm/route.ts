import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 참석 확인
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { reservationId } = await request.json();

  if (!reservationId) {
    return NextResponse.json({ error: '예약 ID가 필요합니다.' }, { status: 400 });
  }

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND user_name = ?').get(reservationId, session.name) as any;

  if (!reservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  }

  db.prepare('UPDATE reservations SET confirmed = 1, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?').run(reservationId);

  return NextResponse.json({ success: true });
}

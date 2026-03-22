import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 스팟 운영자: 오늘 예약자 목록 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isSpotOperator) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by, confirmed, confirmed_at
    FROM reservations
    WHERE spot = ? AND date = ?
    ORDER BY created_at ASC
  `);
  const reservations = stmt.all(session.spotId, date);

  return NextResponse.json({ reservations });
}

// 스팟 운영자: 체크인 처리
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isSpotOperator) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { reservationId, status } = await request.json();

  if (!reservationId || !['attended', 'no_show', 'unchecked'].includes(status)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  // 해당 예약이 본인 스팟인지 확인
  const reservation = db.prepare(`SELECT * FROM reservations WHERE id = ? AND spot = ?`).get(reservationId, session.spotId) as any;
  if (!reservation) {
    return NextResponse.json({ error: '해당 예약을 찾을 수 없습니다.' }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE reservations 
    SET check_in_status = ?, checked_at = ?, checked_by = ?
    WHERE id = ?
  `).run(status, status === 'unchecked' ? null : now, status === 'unchecked' ? null : session.spotId, reservationId);

  // 노쇼 경고 자동 처리
  if (status === 'no_show') {
    const noShowCount = (db.prepare(`
      SELECT COUNT(*) as count FROM reservations 
      WHERE user_name = ? AND check_in_status = 'no_show'
    `).get(reservation.user_name) as { count: number }).count;

    let warningLevel = 0;
    let message = '';
    if (noShowCount >= 3) {
      warningLevel = 3;
      message = `노쇼 ${noShowCount}회: 멤버십 정지 대상`;
    } else if (noShowCount >= 2) {
      warningLevel = 2;
      message = `노쇼 ${noShowCount}회: 멤버십 갱신 시 안내 필요`;
    } else if (noShowCount >= 1) {
      warningLevel = 1;
      message = `노쇼 ${noShowCount}회: 경고`;
    }

    if (warningLevel > 0) {
      db.prepare(`
        INSERT INTO noshow_warnings (user_name, warning_level, message)
        VALUES (?, ?, ?)
      `).run(reservation.user_name, warningLevel, message);
    }
  }

  return NextResponse.json({ success: true });
}

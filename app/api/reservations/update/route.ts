import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';
import { MAX_CAPACITY, isBookingClosed } from '@/lib/constants';

initDB();

// 예약 변경
export async function PUT(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id, spot } = await request.json();

    if (!id || !spot) {
      return NextResponse.json(
        { error: '예약 ID와 스팟이 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 예약 조회
    const selectStmt = db.prepare('SELECT * FROM reservations WHERE id = ?');
    const reservation = selectStmt.get(id) as any;

    if (!reservation) {
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3시간 전 마감 체크
    if (isBookingClosed(reservation.date)) {
      return NextResponse.json(
        { error: '세션 시작 3시간 전부터는 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 본인의 예약인지 확인
    if (reservation.user_name !== user.name) {
      return NextResponse.json(
        { error: '본인의 예약만 변경할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 스팟 정원 확인 (같은 스팟으로 변경하는 경우 제외)
    if (reservation.spot !== spot) {
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?');
      const { count } = countStmt.get(reservation.date, spot) as { count: number };

      if (count >= MAX_CAPACITY) {
        return NextResponse.json(
          { error: '해당 스팟의 정원이 가득 찼습니다.' },
          { status: 400 }
        );
      }
    }

    // 예약 변경
    const updateStmt = db.prepare('UPDATE reservations SET spot = ? WHERE id = ?');
    updateStmt.run(spot, id);

    // 로그 기록
    const logStmt = db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)');
    logStmt.run(user.name, reservation.date, spot, `UPDATE (from ${reservation.spot})`);

    return NextResponse.json({ success: true, message: '예약이 변경되었습니다.' });
  } catch (error) {
    console.error('Update reservation error:', error);
    return NextResponse.json(
      { error: '예약 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

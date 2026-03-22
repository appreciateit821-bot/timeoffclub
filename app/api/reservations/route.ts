import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';
import { MAX_CAPACITY, isBookingClosed } from '@/lib/constants';

initDB();

// 예약 목록 조회
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    let reservations;

    if (date) {
      // 특정 날짜의 예약 조회
      const stmt = db.prepare('SELECT * FROM reservations WHERE date = ? ORDER BY created_at');
      reservations = stmt.all(date);

      // 스팟별 모드 통계
      const modeStats = db.prepare(`
        SELECT spot, mode, COUNT(*) as count
        FROM reservations WHERE date = ?
        GROUP BY spot, mode
      `).all(date);

      return NextResponse.json({ reservations, modeStats });
    } else {
      // 사용자의 모든 예약 조회
      const stmt = db.prepare('SELECT * FROM reservations WHERE user_name = ? ORDER BY date');
      reservations = stmt.all(user.name);
    }

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 예약 생성
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const { date, spot, mode, memo, energy } = await request.json();

    if (!date || !spot) {
      return NextResponse.json(
        { error: '날짜와 스팟을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 3시간 전 마감 체크
    if (isBookingClosed(date)) {
      return NextResponse.json(
        { error: '세션 시작 3시간 전부터는 예약할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 체험권 사용자: 1회만 예약 가능
    if (user.phoneLast4?.startsWith('T-')) {
      const trialCount = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE user_name = ?').get(user.name) as { count: number };
      if (trialCount.count >= 1) {
        return NextResponse.json(
          { error: '체험권은 1회만 예약 가능합니다.' },
          { status: 400 }
        );
      }
      // 체험권 사용 처리
      db.prepare('UPDATE trial_tickets SET is_used = 1, used_at = CURRENT_TIMESTAMP, phone_last4 = ? WHERE code = ?').run(user.phoneLast4, user.phoneLast4);
    }

    // 해당 날짜에 이미 예약이 있는지 확인
    const existingStmt = db.prepare('SELECT * FROM reservations WHERE user_name = ? AND date = ?');
    const existing = existingStmt.get(user.name, date);

    if (existing) {
      return NextResponse.json(
        { error: '이미 해당 날짜에 예약이 있습니다.' },
        { status: 400 }
      );
    }

    // 스팟 정원 확인
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?');
    const { count } = countStmt.get(date, spot) as { count: number };

    if (count >= MAX_CAPACITY) {
      return NextResponse.json(
        { error: '해당 스팟의 정원이 가득 찼습니다.' },
        { status: 400 }
      );
    }

    // 예약 생성
    const insertStmt = db.prepare('INSERT INTO reservations (user_name, date, spot, mode, memo, energy) VALUES (?, ?, ?, ?, ?, ?)');
    insertStmt.run(user.name, date, spot, mode || 'smalltalk', memo || '', energy || 'normal');

    // 로그 기록
    const logStmt = db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)');
    logStmt.run(user.name, date, spot, 'CREATE');

    return NextResponse.json({ success: true, message: '예약이 완료되었습니다.' });
  } catch (error) {
    console.error('Create reservation error:', error);
    return NextResponse.json(
      { error: '예약 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 예약 삭제
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '예약 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 예약 정보 조회
    const selectStmt = db.prepare('SELECT * FROM reservations WHERE id = ?');
    const reservation = selectStmt.get(id) as any;

    if (!reservation) {
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3시간 전 마감 체크 (관리자는 제외)
    if (!user.isAdmin && isBookingClosed(reservation.date)) {
      return NextResponse.json(
        { error: '세션 시작 3시간 전부터는 취소할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 본인의 예약인지 확인 (관리자는 모든 예약 삭제 가능)
    if (!user.isAdmin && reservation.user_name !== user.name) {
      return NextResponse.json(
        { error: '본인의 예약만 취소할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 예약 삭제
    const deleteStmt = db.prepare('DELETE FROM reservations WHERE id = ?');
    deleteStmt.run(id);

    // 로그 기록
    const logStmt = db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)');
    logStmt.run(reservation.user_name, reservation.date, reservation.spot, 'CANCEL');

    return NextResponse.json({ success: true, message: '예약이 취소되었습니다.' });
  } catch (error) {
    console.error('Delete reservation error:', error);
    return NextResponse.json(
      { error: '예약 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// 스팟 운영자의 예약 조회
export async function GET() {
  const user = await getSession();

  if (!user || (!user.isSpotOperator && !user.isAdmin)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    let reservations;

    if (user.isAdmin) {
      // 슈퍼관리자는 모든 예약 조회 가능
      const stmt = db.prepare(`
        SELECT * FROM reservations
        ORDER BY date DESC, spot, user_name
      `);
      reservations = stmt.all();
    } else if (user.isSpotOperator && user.spotId) {
      // 스팟 운영자는 본인 스팟만 조회
      const stmt = db.prepare(`
        SELECT * FROM reservations
        WHERE spot = ?
        ORDER BY date DESC, user_name
      `);
      reservations = stmt.all(user.spotId);
    } else {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Get spot reservations error:', error);
    return NextResponse.json(
      { error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

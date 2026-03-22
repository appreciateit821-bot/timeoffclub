import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// 스팟 운영자의 로그 조회
export async function GET() {
  const user = await getSession();

  if (!user || (!user.isSpotOperator && !user.isAdmin)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    let logs;

    if (user.isAdmin) {
      // 슈퍼관리자는 모든 로그 조회 가능
      const stmt = db.prepare(`
        SELECT * FROM reservation_logs
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      logs = stmt.all();
    } else if (user.isSpotOperator && user.spotId) {
      // 스팟 운영자는 본인 스팟만 조회
      const stmt = db.prepare(`
        SELECT * FROM reservation_logs
        WHERE spot = ?
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      logs = stmt.all(user.spotId);
    } else {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get spot logs error:', error);
    return NextResponse.json(
      { error: '로그를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// 모든 예약 조회 (관리자)
export async function GET() {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const stmt = db.prepare(`
      SELECT * FROM reservations
      ORDER BY date DESC, spot, user_name
    `);
    const reservations = stmt.all();

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Get all reservations error:', error);
    return NextResponse.json(
      { error: '예약 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

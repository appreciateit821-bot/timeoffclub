import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// 모든 로그 조회 (관리자)
export async function GET() {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const stmt = db.prepare(`
      SELECT * FROM reservation_logs
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    const logs = stmt.all();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { error: '로그를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

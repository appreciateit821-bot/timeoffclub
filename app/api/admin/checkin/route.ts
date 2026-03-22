import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 슈퍼관리자: 체크인 현황 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  let reservations;
  if (date) {
    reservations = db.prepare(`
      SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by
      FROM reservations
      WHERE date = ?
      ORDER BY spot, created_at ASC
    `).all(date);
  } else {
    // 최근 30일
    reservations = db.prepare(`
      SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by
      FROM reservations
      WHERE date >= date('now', '-30 days')
      ORDER BY date DESC, spot, created_at ASC
    `).all();
  }

  // 노쇼 통계
  const noShowStats = db.prepare(`
    SELECT user_name, COUNT(*) as no_show_count
    FROM reservations
    WHERE check_in_status = 'no_show'
    GROUP BY user_name
    ORDER BY no_show_count DESC
  `).all();

  // 전체 통계
  const stats = db.prepare(`
    SELECT 
      check_in_status,
      COUNT(*) as count
    FROM reservations
    WHERE date >= date('now', '-30 days')
    GROUP BY check_in_status
  `).all();

  return NextResponse.json({ reservations, noShowStats, stats });
}

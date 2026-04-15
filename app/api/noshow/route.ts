import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { processAutoNoShow } from '@/lib/noshow';
import { cookies } from 'next/headers';

export const runtime = 'edge';

// GET: 로그인한 멤버의 최근 노쇼 기록 조회 + 자동 노쇼 처리
export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ noShows: [], totalNoShows: 0, dismissed: false });

  await processAutoNoShow(db);

  const now = new Date();
  // 현재 사용자의 최근 노쇼 기록 반환 (최근 30일)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { results: recentNoShows } = await db.prepare(
    `SELECT date, spot FROM reservations
     WHERE user_name = ? AND check_in_status = 'no_show' AND date >= ?
     ORDER BY date DESC`
  ).bind(session.name, thirtyDaysAgo).all();

  // 3. 총 노쇼 횟수
  const totalNoShows = (await db.prepare(
    `SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'`
  ).bind(session.name).first() as any)?.count || 0;

  // 4. 캘린더 배너 닫기 여부 확인 (쿠키)
  const cookieStore = await cookies();
  const dismissedCookie = cookieStore.get('noshow_dismissed');
  // 쿠키에 저장된 날짜 이후 새 노쇼가 없으면 dismissed
  let dismissed = false;
  if (dismissedCookie && recentNoShows.length > 0) {
    const latestNoShow = (recentNoShows as any[])[0].date;
    dismissed = dismissedCookie.value >= latestNoShow;
  }

  return NextResponse.json({
    noShows: recentNoShows,
    totalNoShows,
    dismissed
  });
}

// PUT: 노쇼 경고 캘린더 배너 닫기
export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const cookieStore = await cookies();
  const today = new Date().toISOString().split('T')[0];
  cookieStore.set('noshow_dismissed', today, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90 // 90일
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSessionEndTime, AVAILABLE_DAYS } from '@/lib/constants';
import { cookies } from 'next/headers';

export const runtime = 'edge';

// GET: 로그인한 멤버의 최근 노쇼 기록 조회 + 자동 노쇼 처리
export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ noShows: [], totalNoShows: 0, dismissed: false });

  // 1. 세션 종료된 미체크 예약을 자동 노쇼 처리
  const now = new Date();
  const { results: unchecked } = await db.prepare(
    `SELECT id, user_name, date, spot FROM reservations
     WHERE check_in_status = 'unchecked' AND date < ?
     ORDER BY date DESC`
  ).bind(now.toISOString().split('T')[0]).all();

  for (const r of unchecked as any[]) {
    const d = new Date(r.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek !== AVAILABLE_DAYS.WEDNESDAY && dayOfWeek !== AVAILABLE_DAYS.SUNDAY) continue;

    const endTime = getSessionEndTime(r.date);
    if (now.getTime() < endTime.getTime()) continue;

    await db.prepare(
      `UPDATE reservations SET check_in_status = 'no_show', checked_at = ?, checked_by = 'auto' WHERE id = ?`
    ).bind(now.toISOString(), r.id).run();

    const noShowCount = (await db.prepare(
      `SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'`
    ).bind(r.user_name).first() as any)?.count || 0;

    const warningLevel = noShowCount >= 3 ? 3 : noShowCount >= 2 ? 2 : 1;
    const message = `노쇼 ${noShowCount}회${noShowCount >= 3 ? ': 멤버십 정지 대상' : noShowCount >= 2 ? ': 갱신 안내 필요' : ': 경고'}`;
    await db.prepare(
      'INSERT INTO noshow_warnings (user_name, warning_level, message) VALUES (?, ?, ?)'
    ).bind(r.user_name, warningLevel, message).run();
  }

  // 2. 현재 사용자의 최근 노쇼 기록 반환 (최근 30일)
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

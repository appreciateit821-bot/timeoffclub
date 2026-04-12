import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSessionEndTime, AVAILABLE_DAYS } from '@/lib/constants';

export const runtime = 'edge';

// GET: 로그인한 멤버의 최근 노쇼 기록 조회 + 자동 노쇼 처리
export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ noShows: [] });

  // 1. 세션 종료된 미체크 예약을 자동 노쇼 처리
  const now = new Date();
  const { results: unchecked } = await db.prepare(
    `SELECT id, user_name, date, spot FROM reservations
     WHERE check_in_status = 'unchecked' AND date < ?
     ORDER BY date DESC`
  ).bind(now.toISOString().split('T')[0]).all();

  for (const r of unchecked as any[]) {
    // 해당 날짜의 세션 종료 시간 확인
    const d = new Date(r.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay();
    // 수요일(3) 또는 일요일(0)이 아니면 스킵
    if (dayOfWeek !== AVAILABLE_DAYS.WEDNESDAY && dayOfWeek !== AVAILABLE_DAYS.SUNDAY) continue;

    const endTime = getSessionEndTime(r.date);
    if (now.getTime() < endTime.getTime()) continue; // 아직 세션 끝 안 남

    // 미체크 → 노쇼 처리
    await db.prepare(
      `UPDATE reservations SET check_in_status = 'no_show', checked_at = ?, checked_by = 'auto' WHERE id = ?`
    ).bind(now.toISOString(), r.id).run();

    // 노쇼 경고 기록
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

  return NextResponse.json({
    noShows: recentNoShows,
    totalNoShows
  });
}

// PUT: 노쇼 경고 확인 (닫기)
export async function PUT() {
  return NextResponse.json({ success: true });
}

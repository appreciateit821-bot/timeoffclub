import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  const { results: reservations } = date
    ? await db.prepare('SELECT * FROM reservations WHERE date = ? ORDER BY spot, created_at ASC').bind(date).all()
    : await db.prepare("SELECT * FROM reservations WHERE date >= date('now', '-30 days') ORDER BY date DESC, spot, created_at ASC").all();

  const { results: noShowStats } = await db.prepare("SELECT user_name, COUNT(*) as no_show_count FROM reservations WHERE check_in_status = 'no_show' GROUP BY user_name ORDER BY no_show_count DESC").all();
  const { results: stats } = await db.prepare("SELECT check_in_status, COUNT(*) as count FROM reservations WHERE date >= date('now', '-30 days') GROUP BY check_in_status").all();

  return NextResponse.json({ reservations, noShowStats, stats });
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { reservationId, status } = await request.json();
  if (!reservationId || !['attended', 'no_show', 'unchecked'].includes(status)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ?').bind(reservationId).first() as any;
  if (!reservation) return NextResponse.json({ error: '예약 없음' }, { status: 404 });

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE reservations SET check_in_status = ?, checked_at = ?, checked_by = ? WHERE id = ?'
  ).bind(
    status,
    status === 'unchecked' ? null : now,
    status === 'unchecked' ? null : 'admin',
    reservationId
  ).run();

  // 노쇼 → 출석 변경 시 노쇼 경고 삭제 불필요 (경고는 기록용으로 유지)
  // 출석 → 노쇼 변경 시 경고 추가
  if (status === 'no_show') {
    const noShowCount = (await db.prepare(
      "SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'"
    ).bind(reservation.user_name).first() as any)?.count || 0;
    const warningLevel = noShowCount >= 3 ? 3 : noShowCount >= 2 ? 2 : 1;
    const message = `노쇼 ${noShowCount}회${noShowCount >= 3 ? ': 멤버십 정지 대상' : noShowCount >= 2 ? ': 갱신 안내 필요' : ': 경고'}`;
    await db.prepare(
      'INSERT INTO noshow_warnings (user_name, warning_level, message) VALUES (?, ?, ?)'
    ).bind(reservation.user_name, warningLevel, message).run();
  }

  return NextResponse.json({ success: true, status });
}

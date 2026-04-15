import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { processAutoNoShow } from '@/lib/noshow';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isSpotOperator || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  await processAutoNoShow(db);

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { results: reservations } = await db.prepare('SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by, confirmed, confirmed_at, mode, memo FROM reservations WHERE spot = ? AND date = ? ORDER BY created_at ASC').bind(session.spotId, date).all();
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  const { results: trials } = await db.prepare('SELECT name FROM trial_tickets WHERE name IS NOT NULL').all();
  const trialNames = new Set((trials as any[]).map(t => t.name));
  const masked = (reservations as any[]).map(r => ({ ...r, display_id: nameToPhone[r.user_name] || '****', is_trial: !nameToPhone[r.user_name] && trialNames.has(r.user_name) }));

  // 날짜 무관 확인 대기 중인 자동 노쇼 (최근 30일)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { results: pending } = await db.prepare(
    `SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by, mode, memo
     FROM reservations WHERE spot = ? AND check_in_status = 'no_show' AND checked_by = 'auto' AND date >= ?
     ORDER BY date DESC, created_at ASC`
  ).bind(session.spotId, thirtyDaysAgo).all();
  const pendingMasked = (pending as any[]).map(r => ({ ...r, display_id: nameToPhone[r.user_name] || '****', is_trial: !nameToPhone[r.user_name] && trialNames.has(r.user_name) }));

  return NextResponse.json({ reservations: masked, pendingAutoNoShows: pendingMasked });
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isSpotOperator || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { reservationId, status, action } = await request.json();

  const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ? AND spot = ?').bind(reservationId, session.spotId).first() as any;
  if (!reservation) return NextResponse.json({ error: '예약 없음' }, { status: 404 });

  const now = new Date().toISOString();

  // 자동 노쇼 확인: status 변경 없이 checked_by만 운영자로 갱신
  if (action === 'confirm_auto_noshow') {
    if (reservation.check_in_status !== 'no_show' || reservation.checked_by !== 'auto') {
      return NextResponse.json({ error: '확인 대상 아님' }, { status: 400 });
    }
    await db.prepare('UPDATE reservations SET checked_by = ? WHERE id = ?').bind(session.spotId, reservationId).run();
    return NextResponse.json({ success: true });
  }

  if (!reservationId || !['attended', 'no_show', 'unchecked'].includes(status)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  // 자동 노쇼 → 출석 변경 시 가장 최근 노쇼 경고 삭제
  const wasAutoNoShow = reservation.check_in_status === 'no_show' && reservation.checked_by === 'auto';

  await db.prepare('UPDATE reservations SET check_in_status = ?, checked_at = ?, checked_by = ? WHERE id = ?')
    .bind(status, status === 'unchecked' ? null : now, status === 'unchecked' ? null : session.spotId, reservationId).run();

  if (wasAutoNoShow && status === 'attended') {
    await db.prepare(
      `DELETE FROM noshow_warnings WHERE id = (
         SELECT id FROM noshow_warnings WHERE user_name = ? ORDER BY id DESC LIMIT 1
       )`
    ).bind(reservation.user_name).run();
  }

  if (status === 'no_show' && reservation.check_in_status !== 'no_show') {
    const noShowCount = (await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'").bind(reservation.user_name).first() as any)?.count || 0;
    let warningLevel = noShowCount >= 3 ? 3 : noShowCount >= 2 ? 2 : 1;
    let message = noShowCount >= 3 ? `노쇼 ${noShowCount}회: 멤버십 정지 대상` : noShowCount >= 2 ? `노쇼 ${noShowCount}회: 갱신 안내 필요` : `노쇼 ${noShowCount}회: 경고`;
    await db.prepare('INSERT INTO noshow_warnings (user_name, warning_level, message) VALUES (?, ?, ?)').bind(reservation.user_name, warningLevel, message).run();
  }

  return NextResponse.json({ success: true });
}

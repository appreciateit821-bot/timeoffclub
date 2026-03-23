import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isSpotOperator || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { results: reservations } = await db.prepare('SELECT id, user_name, date, spot, check_in_status, checked_at, checked_by, confirmed, confirmed_at, mode, memo FROM reservations WHERE spot = ? AND date = ? ORDER BY created_at ASC').bind(session.spotId, date).all();
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  const masked = (reservations as any[]).map(r => ({ ...r, display_id: nameToPhone[r.user_name] || '****' }));
  return NextResponse.json({ reservations: masked });
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isSpotOperator || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { reservationId, status } = await request.json();
  if (!reservationId || !['attended', 'no_show', 'unchecked'].includes(status)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ? AND spot = ?').bind(reservationId, session.spotId).first() as any;
  if (!reservation) return NextResponse.json({ error: '예약 없음' }, { status: 404 });

  const now = new Date().toISOString();
  await db.prepare('UPDATE reservations SET check_in_status = ?, checked_at = ?, checked_by = ? WHERE id = ?')
    .bind(status, status === 'unchecked' ? null : now, status === 'unchecked' ? null : session.spotId, reservationId).run();

  if (status === 'no_show') {
    const noShowCount = (await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'").bind(reservation.user_name).first() as any)?.count || 0;
    let warningLevel = noShowCount >= 3 ? 3 : noShowCount >= 2 ? 2 : 1;
    let message = noShowCount >= 3 ? `노쇼 ${noShowCount}회: 멤버십 정지 대상` : noShowCount >= 2 ? `노쇼 ${noShowCount}회: 갱신 안내 필요` : `노쇼 ${noShowCount}회: 경고`;
    await db.prepare('INSERT INTO noshow_warnings (user_name, warning_level, message) VALUES (?, ?, ?)').bind(reservation.user_name, warningLevel, message).run();
  }

  return NextResponse.json({ success: true });
}

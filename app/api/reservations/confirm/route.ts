import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { reservationId } = await request.json();
  if (!reservationId) return NextResponse.json({ error: '예약 ID가 필요합니다.' }, { status: 400 });

  const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ? AND user_name = ?').bind(reservationId, session.name).first();
  if (!reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });

  await db.prepare('UPDATE reservations SET confirmed = 1, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?').bind(reservationId).run();
  return NextResponse.json({ success: true });
}

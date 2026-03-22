import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB, initDB } from '@/lib/db';
import { MAX_CAPACITY, isBookingClosed } from '@/lib/constants';

export const runtime = 'edge';

export async function PUT(request: NextRequest) {
  await initDB();
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  try {
    const { id, spot } = await request.json();
    if (!id || !spot) return NextResponse.json({ error: '예약 ID와 스팟이 필요합니다.' }, { status: 400 });

    const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first() as any;
    if (!reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    if (isBookingClosed(reservation.date)) return NextResponse.json({ error: '세션 시작 3시간 전부터는 변경할 수 없습니다.' }, { status: 400 });
    if (reservation.user_name !== user.name) return NextResponse.json({ error: '본인의 예약만 변경할 수 있습니다.' }, { status: 403 });

    if (reservation.spot !== spot) {
      const countResult = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(reservation.date, spot).first() as any;
      if (countResult?.count >= MAX_CAPACITY) return NextResponse.json({ error: '해당 스팟의 정원이 가득 찼습니다.' }, { status: 400 });
    }

    await db.prepare('UPDATE reservations SET spot = ? WHERE id = ?').bind(spot, id).run();
    await db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)').bind(user.name, reservation.date, spot, `UPDATE (from ${reservation.spot})`).run();

    return NextResponse.json({ success: true, message: '예약이 변경되었습니다.' });
  } catch (error) {
    console.error('Update reservation error:', error);
    return NextResponse.json({ error: '예약 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if ((!session?.isSpotOperator && !session?.isAdmin) || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE spot = ? ORDER BY date DESC').bind(session.spotId || session.name).all();
  return NextResponse.json({ reservations });
}

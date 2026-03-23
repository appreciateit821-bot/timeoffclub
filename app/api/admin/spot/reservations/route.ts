import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if ((!session?.isSpotOperator && !session?.isAdmin) || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE spot = ? ORDER BY date DESC').bind(session.spotId || session.name).all();
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  const masked = (reservations as any[]).map(r => ({ ...r, display_id: nameToPhone[r.user_name] || '****' }));
  return NextResponse.json({ reservations: masked });
}

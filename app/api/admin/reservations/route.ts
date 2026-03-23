import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations ORDER BY date DESC, spot').all();
  // 이름 → 뒷4자리 매핑
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  const masked = (reservations as any[]).map(r => ({
    ...r,
    display_id: nameToPhone[r.user_name] || '****',
    user_name: r.user_name // 웰모먼트는 실명도 필요할 수 있으므로 유지
  }));
  return NextResponse.json({ reservations: masked });
}

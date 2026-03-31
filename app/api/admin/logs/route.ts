import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: logs } = await db.prepare('SELECT * FROM reservation_logs ORDER BY created_at DESC LIMIT 1000').all();
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  const masked = (logs as any[]).map(l => ({ ...l, display_id: l.phone_last4 || nameToPhone[l.user_name] || '****' }));
  return NextResponse.json({ logs: masked });
}

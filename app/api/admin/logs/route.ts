import { NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: logs } = await db.prepare('SELECT * FROM reservation_logs ORDER BY created_at DESC LIMIT 1000').all();
  return NextResponse.json({ logs });
}

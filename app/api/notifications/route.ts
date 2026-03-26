import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { results } = await db.prepare(
    'SELECT * FROM notifications WHERE user_name = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10'
  ).bind(session.name).all();

  return NextResponse.json({ notifications: results });
}

export async function PUT(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { id } = await request.json();
  if (id) {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_name = ?').bind(id, session.name).run();
  } else {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_name = ?').bind(session.name).run();
  }
  return NextResponse.json({ success: true });
}

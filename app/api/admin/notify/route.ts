import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { userName, title, body } = await request.json();
  if (!userName || !body) return NextResponse.json({ error: '멤버 이름과 내용 필요' }, { status: 400 });

  await db.prepare(
    'INSERT INTO notifications (user_name, title, body, type) VALUES (?, ?, ?, ?)'
  ).bind(userName, title || '📢 웰모먼트 안내', body, 'admin').run();

  return NextResponse.json({ success: true });
}

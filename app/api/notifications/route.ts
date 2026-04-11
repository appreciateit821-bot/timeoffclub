import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 오늘이 세션일(수=3, 일=0)이 아니면 "오늘 세션" 관련 알림은 제외
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
  const dayOfWeek = kst.getDay();
  const isSessionDay = dayOfWeek === 0 || dayOfWeek === 3;

  // 24시간 지난 "오늘 세션" 관련 알림은 자동 제외 (DB에 남아있어도)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let query = 'SELECT * FROM notifications WHERE user_name = ? AND is_read = 0';
  const params: any[] = [session.name];

  if (!isSessionDay) {
    // 세션이 없는 날엔 "오늘 세션" 관련 메시지 숨김
    query += ` AND title NOT LIKE '%오늘%타임오프%' AND body NOT LIKE '%오늘 저녁%' AND body NOT LIKE '%오늘 타임오프%' AND body NOT LIKE '%오늘도 타임오프%'`;
  }

  query += ' AND created_at > ? ORDER BY created_at DESC LIMIT 10';
  params.push(dayAgo);

  const { results } = await db.prepare(query).bind(...params).all();

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

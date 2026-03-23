import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot, description, personDescription } = await request.json();
  if (!date || !spot || !description?.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }

  // 참석한 세션인지 확인
  const attended = await db.prepare(
    "SELECT * FROM reservations WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'"
  ).bind(session.name, date, spot).first();

  if (!attended) {
    return NextResponse.json({ error: '참석한 세션에 대해서만 신고할 수 있습니다.' }, { status: 400 });
  }

  await db.prepare(
    'INSERT INTO reports (reporter_name, date, spot, description, person_description) VALUES (?, ?, ?, ?, ?)'
  ).bind(session.name, date, spot, description.trim(), personDescription?.trim() || '').run();

  return NextResponse.json({ success: true });
}

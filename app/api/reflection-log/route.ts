import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { results } = await db.prepare(
    'SELECT * FROM reflection_logs WHERE user_name = ? ORDER BY created_at DESC'
  ).bind(session.name).all();

  return NextResponse.json({ logs: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot, activity, feeling, insight, nextTime } = await request.json();
  if (!date || !spot) return NextResponse.json({ error: '세션 정보 필요' }, { status: 400 });

  // 참석한 세션인지 확인
  const attended = await db.prepare(
    "SELECT * FROM reservations WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'"
  ).bind(session.name, date, spot).first();
  if (!attended) return NextResponse.json({ error: '참석한 세션에만 회고를 남길 수 있습니다.' }, { status: 400 });

  const existing = await db.prepare(
    'SELECT * FROM reflection_logs WHERE user_name = ? AND date = ? AND spot = ?'
  ).bind(session.name, date, spot).first();

  if (existing) {
    await db.prepare(
      'UPDATE reflection_logs SET activity = ?, feeling = ?, insight = ?, next_time = ? WHERE user_name = ? AND date = ? AND spot = ?'
    ).bind(activity || '', feeling || '', insight || '', nextTime || '', session.name, date, spot).run();
  } else {
    await db.prepare(
      'INSERT INTO reflection_logs (user_name, date, spot, activity, feeling, insight, next_time) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(session.name, date, spot, activity || '', feeling || '', insight || '', nextTime || '').run();
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  if (date && spot) {
    const { results: waitlist } = await db.prepare('SELECT * FROM waitlist WHERE date = ? AND spot = ? ORDER BY position ASC').bind(date, spot).all();
    const myWait = await db.prepare('SELECT * FROM waitlist WHERE user_name = ? AND date = ? AND spot = ?').bind(session.name, date, spot).first();
    return NextResponse.json({ waitlist, myWait, count: waitlist.length });
  }

  const { results: waitlist } = await db.prepare('SELECT * FROM waitlist WHERE user_name = ? ORDER BY date').bind(session.name).all();
  return NextResponse.json({ waitlist });
}

export async function POST(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot } = await request.json();
  if (!date || !spot) return NextResponse.json({ error: '날짜와 스팟이 필요합니다.' }, { status: 400 });

  const existing = await db.prepare('SELECT * FROM reservations WHERE user_name = ? AND date = ?').bind(session.name, date).first();
  if (existing) return NextResponse.json({ error: '이미 해당 날짜에 예약이 있습니다.' }, { status: 400 });

  const alreadyWaiting = await db.prepare('SELECT * FROM waitlist WHERE user_name = ? AND date = ? AND spot = ?').bind(session.name, date, spot).first();
  if (alreadyWaiting) return NextResponse.json({ error: '이미 대기 중입니다.' }, { status: 400 });

  const countResult = await db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
  const position = (countResult?.count || 0) + 1;

  await db.prepare('INSERT INTO waitlist (user_name, date, spot, position) VALUES (?, ?, ?, ?)').bind(session.name, date, spot, position).run();
  return NextResponse.json({ success: true, position });
}

export async function DELETE(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });

  await db.prepare('DELETE FROM waitlist WHERE id = ? AND user_name = ?').bind(id, session.name).run();
  return NextResponse.json({ success: true });
}

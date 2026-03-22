import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 대기 목록 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  if (date && spot) {
    const waitlist = db.prepare('SELECT * FROM waitlist WHERE date = ? AND spot = ? ORDER BY position ASC').all(date, spot);
    const myWait = db.prepare('SELECT * FROM waitlist WHERE user_name = ? AND date = ? AND spot = ?').get(session.name, date, spot);
    return NextResponse.json({ waitlist, myWait, count: waitlist.length });
  }

  // 내 대기 목록
  const myWaitlist = db.prepare('SELECT * FROM waitlist WHERE user_name = ? ORDER BY date').all(session.name);
  return NextResponse.json({ waitlist: myWaitlist });
}

// 대기 등록
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { date, spot } = await request.json();

  if (!date || !spot) {
    return NextResponse.json({ error: '날짜와 스팟이 필요합니다.' }, { status: 400 });
  }

  // 이미 예약이 있는지 확인
  const existing = db.prepare('SELECT * FROM reservations WHERE user_name = ? AND date = ?').get(session.name, date);
  if (existing) {
    return NextResponse.json({ error: '이미 해당 날짜에 예약이 있습니다.' }, { status: 400 });
  }

  // 이미 대기 중인지 확인
  const alreadyWaiting = db.prepare('SELECT * FROM waitlist WHERE user_name = ? AND date = ? AND spot = ?').get(session.name, date, spot);
  if (alreadyWaiting) {
    return NextResponse.json({ error: '이미 대기 중입니다.' }, { status: 400 });
  }

  // 현재 대기 순서
  const { count } = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE date = ? AND spot = ?').get(date, spot) as { count: number };

  db.prepare('INSERT INTO waitlist (user_name, date, spot, position) VALUES (?, ?, ?, ?)').run(session.name, date, spot, count + 1);

  return NextResponse.json({ success: true, position: count + 1 });
}

// 대기 취소
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
  }

  db.prepare('DELETE FROM waitlist WHERE id = ? AND user_name = ?').run(id, session.name);
  return NextResponse.json({ success: true });
}

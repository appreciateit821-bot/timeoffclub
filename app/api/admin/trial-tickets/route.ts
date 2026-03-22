import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 체험권 목록 조회
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const tickets = db.prepare('SELECT * FROM trial_tickets ORDER BY created_at DESC').all();
  return NextResponse.json({ tickets });
}

// 체험권 발급
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { count = 1 } = await request.json();
  const codes: string[] = [];

  const insertStmt = db.prepare('INSERT INTO trial_tickets (code) VALUES (?)');

  for (let i = 0; i < Math.min(count, 50); i++) {
    const code = 'T-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      insertStmt.run(code);
      codes.push(code);
    } catch (e) {
      // 중복 코드 스킵
    }
  }

  return NextResponse.json({ success: true, codes, count: codes.length });
}

// 체험권 삭제
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
  }

  db.prepare('DELETE FROM trial_tickets WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

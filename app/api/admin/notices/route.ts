import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// 공지 조회 (운영자 + 관리자)
export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 스팟 운영자: 자기 스팟 + 전체 공지
  // 관리자: 전체
  let results;
  if (session.isAdmin) {
    ({ results } = await db.prepare('SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC LIMIT 50').all());
  } else if (session.isSpotOperator) {
    ({ results } = await db.prepare("SELECT * FROM notices WHERE target = 'all' OR target = ? ORDER BY is_pinned DESC, created_at DESC LIMIT 50").bind(session.spotId || '').all());
  } else {
    results = [];
  }

  return NextResponse.json({ notices: results });
}

// 공지 작성 (웰모먼트만)
export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { title, content, target = 'all', isPinned = false } = await request.json();
  if (!title || !content) return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });

  await db.prepare('INSERT INTO notices (title, content, target, is_pinned) VALUES (?, ?, ?, ?)').bind(title, content, target, isPinned ? 1 : 0).run();
  return NextResponse.json({ success: true });
}

// 공지 삭제
export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  await db.prepare('DELETE FROM notices WHERE id = ?').bind(id).run();
  return NextResponse.json({ success: true });
}

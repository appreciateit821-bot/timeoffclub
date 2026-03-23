import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reports } = await db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100').all();
  return NextResponse.json({ reports });
}

// 신고 상태 업데이트 (처리/메모)
export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { id, status, adminNote } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  await db.prepare('UPDATE reports SET status = ?, admin_note = ? WHERE id = ?')
    .bind(status || 'reviewed', adminNote || '', id).run();
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results } = await db.prepare(
    'SELECT * FROM operator_requests ORDER BY is_read ASC, created_at DESC'
  ).all();

  return NextResponse.json({ requests: results });
}

export async function PUT(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { id, adminReply, markRead } = await request.json();
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  if (adminReply !== undefined) {
    await db.prepare('UPDATE operator_requests SET admin_reply = ?, is_read = 1 WHERE id = ?').bind(adminReply, id).run();
  } else if (markRead) {
    await db.prepare('UPDATE operator_requests SET is_read = 1 WHERE id = ?').bind(id).run();
  }

  return NextResponse.json({ success: true });
}

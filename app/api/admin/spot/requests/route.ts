import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results } = await db.prepare(
    'SELECT id, category, content, admin_reply, created_at FROM operator_requests WHERE user_name = ? AND spot = ? ORDER BY created_at DESC'
  ).bind(session.spotId, session.spotId).all();

  return NextResponse.json({ requests: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { category, content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  await db.prepare(
    'INSERT INTO operator_requests (user_name, spot, category, content) VALUES (?, ?, ?, ?)'
  ).bind(session.spotId, session.spotId, category || 'general', content.trim()).run();

  return NextResponse.json({ success: true });
}

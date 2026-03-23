import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { results } = await db.prepare(
    'SELECT id, category, content, spot, admin_reply, created_at FROM operator_requests WHERE user_name = ? ORDER BY created_at DESC'
  ).bind(session.name).all();

  return NextResponse.json({ requests: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { category, content, spot } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  await db.prepare(
    'INSERT INTO operator_requests (user_name, spot, category, content) VALUES (?, ?, ?, ?)'
  ).bind(session.name, spot || null, category || 'general', content.trim()).run();

  return NextResponse.json({ success: true });
}

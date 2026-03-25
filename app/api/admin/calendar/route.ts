import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results } = await db.prepare('SELECT * FROM closed_dates ORDER BY date DESC').all();
  return NextResponse.json({ closedDates: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { date, spot, reason } = await request.json();
  if (!date) return NextResponse.json({ error: '날짜 필요' }, { status: 400 });

  // spot이 null이면 해당 날짜 전체 닫기, 있으면 특정 스팟만
  await db.prepare(
    'INSERT OR REPLACE INTO closed_dates (date, spot, reason) VALUES (?, ?, ?)'
  ).bind(date, spot || null, reason || '').run();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  await db.prepare('DELETE FROM closed_dates WHERE id = ?').bind(id).run();
  return NextResponse.json({ success: true });
}

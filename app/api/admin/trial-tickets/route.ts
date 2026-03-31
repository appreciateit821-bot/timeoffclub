import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const deliveredFilter = searchParams.get('delivered'); // 'all', 'delivered', 'not_delivered'

  let query = 'SELECT * FROM trial_tickets';
  if (deliveredFilter === 'delivered') {
    query += ' WHERE is_delivered = 1';
  } else if (deliveredFilter === 'not_delivered') {
    query += ' WHERE is_delivered = 0';
  }
  query += ' ORDER BY created_at DESC';

  const { results: tickets } = await db.prepare(query).all();
  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { count = 1 } = await request.json();
  const codes: string[] = [];

  for (let i = 0; i < Math.min(count, 50); i++) {
    const code = 'T-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try { await db.prepare('INSERT INTO trial_tickets (code) VALUES (?)').bind(code).run(); codes.push(code); } catch {}
  }

  return NextResponse.json({ success: true, codes, count: codes.length });
}

export async function PUT(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  try {
    const { id, is_delivered } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

    if (is_delivered) {
      await db.prepare('UPDATE trial_tickets SET is_delivered = 1, delivered_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
    } else {
      await db.prepare('UPDATE trial_tickets SET is_delivered = 0, delivered_at = NULL WHERE id = ?').bind(id).run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '업데이트 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  await db.prepare('DELETE FROM trial_tickets WHERE id = ?').bind(id).run();
  return NextResponse.json({ success: true });
}

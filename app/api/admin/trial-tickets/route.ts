import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: tickets } = await db.prepare('SELECT * FROM trial_tickets ORDER BY created_at DESC').all();
  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  await initDB();
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

export async function DELETE(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  await db.prepare('DELETE FROM trial_tickets WHERE id = ?').bind(id).run();
  return NextResponse.json({ success: true });
}

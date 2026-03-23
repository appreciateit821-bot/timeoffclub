import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  let results;
  if (search) {
    ({ results } = await db.prepare('SELECT * FROM members WHERE name LIKE ? OR phone_last4 LIKE ? ORDER BY created_at DESC').bind(`%${search}%`, `%${search}%`).all());
  } else {
    ({ results } = await db.prepare('SELECT * FROM members ORDER BY created_at DESC').all());
  }
  return NextResponse.json({ members: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { name, phoneLast4 } = await request.json();
  if (!name || !phoneLast4) return NextResponse.json({ error: '이름과 뒷4자리 필요' }, { status: 400 });

  try {
    await db.prepare('INSERT INTO members (name, phone_last4) VALUES (?, ?)').bind(name, phoneLast4).run();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '이미 등록된 멤버입니다.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { id, isActive } = await request.json();
  await db.prepare('UPDATE members SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(isActive ? 1 : 0, id).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  await db.prepare('DELETE FROM members WHERE id = ?').bind(id).run();
  return NextResponse.json({ success: true });
}

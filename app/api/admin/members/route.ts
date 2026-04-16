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

  const { name, phoneLast4, activeMonths } = await request.json();
  if (!name || !phoneLast4) return NextResponse.json({ error: '이름과 뒷4자리 필요' }, { status: 400 });

  try {
    await db.prepare('INSERT INTO members (name, phone_last4, active_months) VALUES (?, ?, ?)').bind(name, phoneLast4, activeMonths || '').run();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '이미 등록된 멤버입니다.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { id, isActive, activeMonths } = await request.json();
  if (activeMonths !== undefined) {
    await db.prepare('UPDATE members SET active_months = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(activeMonths, id).run();
  }
  if (isActive !== undefined) {
    await db.prepare('UPDATE members SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(isActive ? 1 : 0, id).run();
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 });

  const steps: string[] = [];
  try {
    steps.push('SELECT target');
    const member = await db.prepare('SELECT id, name FROM members WHERE id = ?').bind(id).first() as any;
    if (!member) return NextResponse.json({ error: '멤버를 찾을 수 없습니다.' }, { status: 404 });

    const name = member.name as string;

    const cascadeTables: Array<{ table: string; col: string }> = [
      { table: 'reservations', col: 'user_name' },
      { table: 'reservation_logs', col: 'user_name' },
      { table: 'waitlist', col: 'user_name' },
      { table: 'noshow_warnings', col: 'user_name' },
      { table: 'feedbacks', col: 'user_name' },
      { table: 'session_moments', col: 'user_name' },
      { table: 'users', col: 'name' },
    ];

    for (const { table, col } of cascadeTables) {
      steps.push(`cascade:${table}`);
      try {
        await db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).bind(name).run();
      } catch (e: any) {
        steps.push(`cascade:${table}:err:${e?.message ?? e}`);
      }
    }

    steps.push('DELETE members');
    const result = await db.prepare('DELETE FROM members WHERE id = ?').bind(id).run() as any;
    const changes = result?.meta?.changes ?? result?.changes ?? 0;

    if (changes === 0) {
      return NextResponse.json({ error: '삭제 실패 — 해당 멤버가 존재하지 않습니다.', steps }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedName: name, changes });
  } catch (e: any) {
    return NextResponse.json({
      error: `서버 오류: ${e?.message ?? String(e)}`,
      lastStep: steps[steps.length - 1] || 'init',
      steps,
    }, { status: 500 });
  }
}

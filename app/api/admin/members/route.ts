import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// 멤버 목록 조회
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = 'SELECT * FROM members';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ? OR phone_last4 LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const members = stmt.all(...params);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: '멤버 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 추가
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { name, phoneLast4 } = await request.json();

    if (!name || !phoneLast4) {
      return NextResponse.json(
        { error: '이름과 연락처 뒷 4자리를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (phoneLast4.length !== 4 || !/^\d+$/.test(phoneLast4)) {
      return NextResponse.json(
        { error: '연락처 뒷 4자리는 숫자 4자리여야 합니다.' },
        { status: 400 }
      );
    }

    // 중복 확인
    const checkStmt = db.prepare('SELECT * FROM members WHERE name = ? AND phone_last4 = ?');
    const existing = checkStmt.get(name, phoneLast4);

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 멤버입니다.' },
        { status: 400 }
      );
    }

    // 멤버 추가
    const insertStmt = db.prepare(`
      INSERT INTO members (name, phone_last4, is_active)
      VALUES (?, ?, 1)
    `);
    const result = insertStmt.run(name, phoneLast4);

    return NextResponse.json({
      success: true,
      message: '멤버가 추가되었습니다.',
      member: { id: result.lastInsertRowid, name, phoneLast4, is_active: 1 }
    });
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json(
      { error: '멤버 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 삭제
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '멤버 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const deleteStmt = db.prepare('DELETE FROM members WHERE id = ?');
    deleteStmt.run(id);

    return NextResponse.json({
      success: true,
      message: '멤버가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: '멤버 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 활성/비활성 토글
export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { id, isActive } = await request.json();

    if (!id || isActive === undefined) {
      return NextResponse.json(
        { error: '멤버 ID와 활성 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    const updateStmt = db.prepare(`
      UPDATE members
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(isActive ? 1 : 0, id);

    return NextResponse.json({
      success: true,
      message: isActive ? '멤버가 활성화되었습니다.' : '멤버가 비활성화되었습니다.'
    });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: '멤버 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

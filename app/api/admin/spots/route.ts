import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// GET: 전체 스팟 상태 조회
export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const rows = await db.prepare('SELECT spot_id, name, is_spot_active, inactive_from, active_from FROM spot_operators ORDER BY id').all() as any;
  return NextResponse.json({ spots: rows.results || [] });
}

// PATCH: 스팟 활성/비활성 설정
export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { spotId, isActive, inactiveFrom, activeFrom } = await request.json();
  if (!spotId) return NextResponse.json({ error: 'spotId 필요' }, { status: 400 });

  if (inactiveFrom !== undefined) {
    await db.prepare('UPDATE spot_operators SET inactive_from = ?, is_spot_active = 1 WHERE spot_id = ?')
      .bind(inactiveFrom || null, spotId).run();
  }
  if (activeFrom !== undefined) {
    await db.prepare('UPDATE spot_operators SET active_from = ? WHERE spot_id = ?')
      .bind(activeFrom || null, spotId).run();
  }
  if (isActive !== undefined && inactiveFrom === undefined) {
    await db.prepare('UPDATE spot_operators SET is_spot_active = ? WHERE spot_id = ?').bind(isActive ? 1 : 0, spotId).run();
  }

  return NextResponse.json({ success: true, spotId });
}

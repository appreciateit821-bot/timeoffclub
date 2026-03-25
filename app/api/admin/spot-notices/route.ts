import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });
  const { results } = await db.prepare('SELECT * FROM spot_notices').all();
  return NextResponse.json({ notices: results });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { spot, notice } = await request.json();
  if (!spot) return NextResponse.json({ error: '스팟 필요' }, { status: 400 });

  if (!notice?.trim()) {
    await db.prepare('DELETE FROM spot_notices WHERE spot = ?').bind(spot).run();
  } else {
    await db.prepare('INSERT INTO spot_notices (spot, notice) VALUES (?, ?) ON CONFLICT(spot) DO UPDATE SET notice = ?, updated_at = CURRENT_TIMESTAMP')
      .bind(spot, notice.trim(), notice.trim()).run();
  }
  return NextResponse.json({ success: true });
}

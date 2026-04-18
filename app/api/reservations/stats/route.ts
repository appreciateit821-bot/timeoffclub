import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // 2026-03 형식

  if (!month) return NextResponse.json({ error: 'month 필요' }, { status: 400 });

  // 날짜별 + 스팟별 인원수 & 모드 통계
  const { results: stats } = await db.prepare(
    `SELECT date, spot, mode, COUNT(*) as count 
     FROM reservations 
     WHERE date LIKE ? 
     GROUP BY date, spot, mode 
     ORDER BY date, spot`
  ).bind(`${month}%`).all();

  // 닫힌 날짜
  const { results: closed } = await db.prepare(
    'SELECT date, spot, reason FROM closed_dates WHERE date LIKE ?'
  ).bind(`${month}%`).all();

  // 비활성 스팟 목록 (즉시 OFF + 월 기반 OFF + 아직 활성 안 된 스팟)
  const { results: inactiveRows } = await db.prepare(
    `SELECT spot_id FROM spot_operators WHERE
      is_spot_active = 0
      OR (inactive_from IS NOT NULL AND inactive_from <= ?)
      OR (active_from IS NOT NULL AND active_from > ?)`
  ).bind(month, month).all();

  return NextResponse.json({ stats, closed, inactiveSpots: (inactiveRows || []).map((r: any) => r.spot_id) });
}

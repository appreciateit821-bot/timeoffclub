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

  return NextResponse.json({ stats, closed });
}

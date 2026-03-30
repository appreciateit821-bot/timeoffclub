import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// 특정 날짜+스팟의 인원 제한 조회
export async function GET(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  // 기본 인원 가져오기
  let defaultCap = 10;
  try {
    const s = await db.prepare("SELECT value FROM settings WHERE key = 'max_capacity'").first() as any;
    if (s) defaultCap = parseInt(s.value);
  } catch {}

  // 스팟별 기본 인원
  const { results: spotDefaults } = await db.prepare("SELECT spot, max_capacity FROM session_capacity WHERE date = 'default'").all();
  const spotDefaultMap: { [spot: string]: number } = {};
  (spotDefaults as any[]).forEach(s => { spotDefaultMap[s.spot] = s.max_capacity; });

  if (date) {
    const { results } = await db.prepare('SELECT * FROM session_capacity WHERE date = ?').bind(date).all();
    return NextResponse.json({ capacities: results, defaultCapacity: defaultCap, spotDefaults: spotDefaultMap });
  }

  // 미래 세션들의 커스텀 인원
  const { results } = await db.prepare("SELECT * FROM session_capacity WHERE date >= date('now') AND date != 'default' ORDER BY date").all();
  return NextResponse.json({ capacities: results, defaultCapacity: defaultCap, spotDefaults: spotDefaultMap });
}

// 특정 세션 인원 설정
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });

  const { date, spot, maxCapacity } = await request.json();
  if (!date || !spot || !maxCapacity) return NextResponse.json({ error: '날짜, 스팟, 인원이 필요합니다.' }, { status: 400 });

  await db.prepare(
    'INSERT INTO session_capacity (date, spot, max_capacity) VALUES (?, ?, ?) ON CONFLICT(date, spot) DO UPDATE SET max_capacity = ?'
  ).bind(date, spot, maxCapacity, maxCapacity).run();

  return NextResponse.json({ success: true });
}

// 세션 인원 설정 삭제 (기본값으로 복원)
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  if (date && spot) {
    await db.prepare('DELETE FROM session_capacity WHERE date = ? AND spot = ?').bind(date, spot).run();
  }
  return NextResponse.json({ success: true });
}

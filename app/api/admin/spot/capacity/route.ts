import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  // 자기 스팟의 기본 인원
  let defaultCap = 10;
  try {
    const spotDefault = await db.prepare("SELECT max_capacity FROM session_capacity WHERE date = 'default' AND spot = ?").bind(session.spotId).first() as any;
    if (spotDefault) defaultCap = spotDefault.max_capacity;
    else {
      const s = await db.prepare("SELECT value FROM settings WHERE key = 'max_capacity'").first() as any;
      if (s) defaultCap = parseInt(s.value);
    }
  } catch {}

  if (date) {
    const custom = await db.prepare('SELECT max_capacity FROM session_capacity WHERE date = ? AND spot = ?').bind(date, session.spotId).first() as any;
    return NextResponse.json({ capacity: custom?.max_capacity || defaultCap, defaultCapacity: defaultCap, isCustom: !!custom });
  }

  return NextResponse.json({ defaultCapacity: defaultCap });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { date, maxCapacity } = await request.json();
  if (!date || !maxCapacity) return NextResponse.json({ error: '날짜와 인원 필요' }, { status: 400 });

  await db.prepare(
    'INSERT INTO session_capacity (date, spot, max_capacity) VALUES (?, ?, ?) ON CONFLICT(date, spot) DO UPDATE SET max_capacity = ?'
  ).bind(date, session.spotId, maxCapacity, maxCapacity).run();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: '날짜 필요' }, { status: 400 });

  await db.prepare('DELETE FROM session_capacity WHERE date = ? AND spot = ?').bind(date, session.spotId).run();
  return NextResponse.json({ success: true });
}

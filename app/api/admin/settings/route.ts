import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  if (!db) return NextResponse.json({ maxCapacity: 10 });

  try {
    // settings 테이블이 없으면 기본값
    const setting = await db.prepare("SELECT value FROM settings WHERE key = 'max_capacity'").first() as any;
    return NextResponse.json({ maxCapacity: setting ? parseInt(setting.value) : 10 });
  } catch {
    return NextResponse.json({ maxCapacity: 10 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 오류' }, { status: 500 });

  const { maxCapacity } = await request.json();
  if (!maxCapacity || maxCapacity < 1 || maxCapacity > 50) {
    return NextResponse.json({ error: '1~50 사이 값이 필요합니다.' }, { status: 400 });
  }

  try {
    await db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
    await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('max_capacity', ?)").bind(String(maxCapacity)).run();
    return NextResponse.json({ success: true, maxCapacity });
  } catch (e) {
    return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  if (date && spot) {
    const { results: moments } = await db.prepare("SELECT moment_text, is_anonymous, CASE WHEN is_anonymous = 1 THEN '익명' ELSE user_name END as display_name, created_at FROM session_moments WHERE date = ? AND spot = ? ORDER BY created_at ASC").bind(date, spot).all();
    return NextResponse.json({ moments });
  }

  const { results: moments } = await db.prepare("SELECT moment_text, date, spot, is_anonymous, CASE WHEN is_anonymous = 1 THEN '익명' ELSE user_name END as display_name, created_at FROM session_moments ORDER BY created_at DESC LIMIT 20").all();
  return NextResponse.json({ moments });
}

export async function POST(request: NextRequest) {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot, momentText, isAnonymous = true } = await request.json();
  if (!date || !spot || !momentText?.trim()) return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });

  const attended = await db.prepare("SELECT * FROM reservations WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'").bind(session.name, date, spot).first();
  if (!attended) return NextResponse.json({ error: '참석한 세션에만 남길 수 있습니다.' }, { status: 400 });

  try {
    // D1 doesn't support ON CONFLICT UPDATE, so check first
    const existing = await db.prepare('SELECT * FROM session_moments WHERE user_name = ? AND date = ? AND spot = ?').bind(session.name, date, spot).first();
    if (existing) {
      await db.prepare('UPDATE session_moments SET moment_text = ?, is_anonymous = ? WHERE user_name = ? AND date = ? AND spot = ?')
        .bind(momentText.trim(), isAnonymous ? 1 : 0, session.name, date, spot).run();
    } else {
      await db.prepare('INSERT INTO session_moments (user_name, date, spot, moment_text, is_anonymous) VALUES (?, ?, ?, ?, ?)')
        .bind(session.name, date, spot, momentText.trim(), isAnonymous ? 1 : 0).run();
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '저장 중 오류' }, { status: 500 });
  }
}

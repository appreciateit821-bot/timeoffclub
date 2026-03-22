import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 특정 세션의 한마디 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  if (date && spot) {
    const moments = db.prepare(`
      SELECT moment_text, is_anonymous, 
        CASE WHEN is_anonymous = 1 THEN '익명' ELSE user_name END as display_name,
        created_at
      FROM session_moments WHERE date = ? AND spot = ?
      ORDER BY created_at ASC
    `).all(date, spot);
    return NextResponse.json({ moments });
  }

  // 최근 모먼트들 (모든 세션)
  const recent = db.prepare(`
    SELECT moment_text, date, spot, is_anonymous,
      CASE WHEN is_anonymous = 1 THEN '익명' ELSE user_name END as display_name,
      created_at
    FROM session_moments ORDER BY created_at DESC LIMIT 20
  `).all();
  return NextResponse.json({ moments: recent });
}

// 한마디 남기기
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot, momentText, isAnonymous = true } = await request.json();

  if (!date || !spot || !momentText?.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }

  // 참석한 세션인지 확인
  const attended = db.prepare(`
    SELECT * FROM reservations WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'
  `).get(session.name, date, spot);

  if (!attended) {
    return NextResponse.json({ error: '참석한 세션에만 남길 수 있습니다.' }, { status: 400 });
  }

  try {
    db.prepare(`
      INSERT INTO session_moments (user_name, date, spot, moment_text, is_anonymous)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_name, date, spot) DO UPDATE SET moment_text = ?, is_anonymous = ?
    `).run(session.name, date, spot, momentText.trim(), isAnonymous ? 1 : 0, momentText.trim(), isAnonymous ? 1 : 0);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '저장 중 오류' }, { status: 500 });
  }
}

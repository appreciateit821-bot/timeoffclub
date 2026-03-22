import { NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const feedbacks = db.prepare(`
    SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 500
  `).all();

  // 불편 신고가 있는 피드백
  const issues = db.prepare(`
    SELECT * FROM feedbacks WHERE person_issue IS NOT NULL AND person_issue != '' ORDER BY created_at DESC
  `).all();

  return NextResponse.json({ feedbacks, issues });
}

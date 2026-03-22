import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

// 내 피드백 목록 조회
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 참석 완료된 세션 목록 (체크인 된 것)
  const attended = db.prepare(`
    SELECT r.id, r.date, r.spot, r.check_in_status
    FROM reservations r
    WHERE r.user_name = ? AND r.check_in_status = 'attended'
    ORDER BY r.date DESC
  `).all(session.name);

  // 이미 피드백 남긴 것
  const feedbacks = db.prepare(`
    SELECT date, spot FROM feedbacks WHERE user_name = ?
  `).all(session.name) as any[];

  const feedbackSet = new Set(feedbacks.map(f => `${f.date}_${f.spot}`));

  const sessionsWithFeedback = (attended as any[]).map(s => ({
    ...s,
    hasFeedback: feedbackSet.has(`${s.date}_${s.spot}`)
  }));

  return NextResponse.json({ sessions: sessionsWithFeedback });
}

// 피드백 제출
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { date, spot, serviceRating, serviceFeedback, personIssue, generalComment } = await request.json();

  if (!date || !spot) {
    return NextResponse.json({ error: '세션 정보가 필요합니다.' }, { status: 400 });
  }

  // 참석 확인
  const attended = db.prepare(`
    SELECT * FROM reservations 
    WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'
  `).get(session.name, date, spot);

  if (!attended) {
    return NextResponse.json({ error: '참석한 세션에만 피드백을 남길 수 있습니다.' }, { status: 400 });
  }

  // 중복 피드백 체크
  const existing = db.prepare(`
    SELECT * FROM feedbacks WHERE user_name = ? AND date = ? AND spot = ?
  `).get(session.name, date, spot);

  if (existing) {
    // 업데이트
    db.prepare(`
      UPDATE feedbacks SET service_rating = ?, service_feedback = ?, person_issue = ?, general_comment = ?
      WHERE user_name = ? AND date = ? AND spot = ?
    `).run(serviceRating || 0, serviceFeedback || '', personIssue || '', generalComment || '', session.name, date, spot);
  } else {
    db.prepare(`
      INSERT INTO feedbacks (user_name, date, spot, service_rating, service_feedback, person_issue, general_comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session.name, date, spot, serviceRating || 0, serviceFeedback || '', personIssue || '', generalComment || '');
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { results: attended } = await db.prepare("SELECT id, date, spot, check_in_status FROM reservations WHERE user_name = ? AND check_in_status = 'attended' ORDER BY date DESC").bind(session.name).all();
  const { results: feedbacks } = await db.prepare('SELECT date, spot FROM feedbacks WHERE user_name = ?').bind(session.name).all();

  const feedbackSet = new Set((feedbacks as any[]).map(f => `${f.date}_${f.spot}`));
  const sessions = (attended as any[]).map(s => ({ ...s, hasFeedback: feedbackSet.has(`${s.date}_${s.spot}`) }));

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { date, spot, serviceRating, serviceFeedback, personIssue, generalComment } = await request.json();
  if (!date || !spot) return NextResponse.json({ error: '세션 정보 필요' }, { status: 400 });

  const attended = await db.prepare("SELECT * FROM reservations WHERE user_name = ? AND date = ? AND spot = ? AND check_in_status = 'attended'").bind(session.name, date, spot).first();
  if (!attended) return NextResponse.json({ error: '참석한 세션에만 피드백 가능' }, { status: 400 });

  const existing = await db.prepare('SELECT * FROM feedbacks WHERE user_name = ? AND date = ? AND spot = ?').bind(session.name, date, spot).first();

  if (existing) {
    await db.prepare('UPDATE feedbacks SET service_rating = ?, service_feedback = ?, person_issue = ?, general_comment = ? WHERE user_name = ? AND date = ? AND spot = ?')
      .bind(serviceRating || 0, serviceFeedback || '', personIssue || '', generalComment || '', session.name, date, spot).run();
  } else {
    await db.prepare('INSERT INTO feedbacks (user_name, date, spot, service_rating, service_feedback, person_issue, general_comment) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(session.name, date, spot, serviceRating || 0, serviceFeedback || '', personIssue || '', generalComment || '').run();
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { isBookingClosed } from '@/lib/constants';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    if (date) {
      const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE date = ? ORDER BY created_at').bind(date).all();
      const { results: modeStats } = await db.prepare('SELECT spot, mode, COUNT(*) as count FROM reservations WHERE date = ? GROUP BY spot, mode').bind(date).all();
      return NextResponse.json({ reservations, modeStats });
    } else {
      const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE user_name = ? ORDER BY date').bind(user.name).all();
      // 노쇼 횟수
      const noShowResult = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'").bind(user.name).first() as any;
      const attendedResult = await db.prepare("SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'attended'").bind(user.name).first() as any;
      return NextResponse.json({ 
        reservations, 
        noShowCount: noShowResult?.count || 0,
        attendedCount: attendedResult?.count || 0
      });
    }
  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json({ error: '예약 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  try {
    const { date, spot, mode, memo, energy } = await request.json();
    if (!date || !spot) return NextResponse.json({ error: '날짜와 스팟을 선택해주세요.' }, { status: 400 });
    if (isBookingClosed(date)) return NextResponse.json({ error: '세션 시작 2시간 전부터는 예약할 수 없습니다.' }, { status: 400 });

    // 닫힌 날짜 체크
    const closedAll = await db.prepare('SELECT * FROM closed_dates WHERE date = ? AND spot IS NULL').bind(date).first();
    if (closedAll) return NextResponse.json({ error: '해당 날짜는 운영이 중단되었습니다.' }, { status: 400 });
    const closedSpot = await db.prepare('SELECT * FROM closed_dates WHERE date = ? AND spot = ?').bind(date, spot).first();
    if (closedSpot) return NextResponse.json({ error: '해당 날짜에 이 스팟은 운영하지 않습니다.' }, { status: 400 });

    // 불편 멤버 회피: 내가 신고한 세션의 참여자가 같은 날짜+스팟에 예약돼있으면 경고 (차단은 아님)
    let conflictWarning = '';
    try {
      const { results: myReports } = await db.prepare(
        'SELECT date as report_date, spot as report_spot FROM reports WHERE reporter_name = ?'
      ).bind(user.name).all();
      for (const report of (myReports as any[])) {
        const { results: coAttendees } = await db.prepare(
          "SELECT user_name FROM reservations WHERE date = ? AND spot = ? AND user_name != ? AND check_in_status = 'attended'"
        ).bind(report.report_date, report.report_spot, user.name).all();
        const coNames = (coAttendees as any[]).map(c => c.user_name);
        if (coNames.length > 0) {
          const placeholders = coNames.map(() => '?').join(',');
          const conflict = await db.prepare(
            `SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ? AND user_name IN (${placeholders})`
          ).bind(date, spot, ...coNames).first() as any;
          if (conflict?.count > 0) {
            conflictWarning = '이전에 불편을 경험한 세션의 참여자가 같은 스팟에 예약되어 있을 수 있습니다.';
            break;
          }
        }
      }
    } catch (e) { /* 실패해도 예약 진행 */ }

    // 체험권 1회 제한
    const isTrial = user.phoneLast4?.startsWith('T-') || false;
    if (isTrial) {
      const trialCount = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE user_name = ?').bind(user.name).first() as any;
      if (trialCount?.count >= 1) return NextResponse.json({ error: '체험권은 1회만 예약 가능합니다.' }, { status: 400 });
      // 예약 시 체험권 소진
      await db.prepare('UPDATE trial_tickets SET is_used = 1, used_at = CURRENT_TIMESTAMP, phone_last4 = ? WHERE code = ?').bind(user.phoneLast4, user.phoneLast4).run();
    }

    const existing = await db.prepare('SELECT * FROM reservations WHERE user_name = ? AND date = ?').bind(user.name, date).first();
    if (existing) return NextResponse.json({ error: '이미 해당 날짜에 예약이 있습니다.' }, { status: 400 });

    // 연속 3번 같은 스팟 방지
    if (!isTrial) {
      const { results: recentRes } = await db.prepare(
        'SELECT spot FROM reservations WHERE user_name = ? ORDER BY date DESC LIMIT 2'
      ).bind(user.name).all();
      const recent = (recentRes as any[]).map(r => r.spot);
      if (recent.length >= 2 && recent[0] === spot && recent[1] === spot) {
        return NextResponse.json({ error: '같은 스팟은 연속 3회까지 예약할 수 없습니다. 다른 스팟을 경험해보세요! 🌿' }, { status: 400 });
      }
    }

    // 세션별 인원 제한 (커스텀 > 기본)
    let maxCap = 10;
    try {
      const custom = await db.prepare("SELECT max_capacity FROM session_capacity WHERE date = ? AND spot = ?").bind(date, spot).first() as any;
      if (custom) { maxCap = custom.max_capacity; }
      else {
        const s = await db.prepare("SELECT value FROM settings WHERE key = 'max_capacity'").first() as any;
        if (s) maxCap = parseInt(s.value);
      }
    } catch {}

    const countResult = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
    if (countResult?.count >= maxCap) return NextResponse.json({ error: '해당 스팟의 정원이 가득 찼습니다.' }, { status: 400 });

    await db.prepare('INSERT INTO reservations (user_name, date, spot, mode, memo, energy, is_trial) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(user.name, date, spot, mode || 'smalltalk', memo || '', energy || 'normal', isTrial ? 1 : 0).run();
    await db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)').bind(user.name, date, spot, 'CREATE').run();

    return NextResponse.json({ success: true, message: '예약이 완료되었습니다.', warning: conflictWarning || undefined });
  } catch (error) {
    console.error('Create reservation error:', error);
    return NextResponse.json({ error: '예약 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '예약 ID가 필요합니다.' }, { status: 400 });

    const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first() as any;
    if (!reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });

    if (!user.isAdmin && isBookingClosed(reservation.date)) return NextResponse.json({ error: '세션 시작 2시간 전부터는 취소할 수 없습니다.' }, { status: 400 });
    if (!user.isAdmin && reservation.user_name !== user.name) return NextResponse.json({ error: '본인의 예약만 취소할 수 있습니다.' }, { status: 403 });

    await db.prepare('DELETE FROM reservations WHERE id = ?').bind(id).run();
    await db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action) VALUES (?, ?, ?, ?)').bind(reservation.user_name, reservation.date, reservation.spot, 'CANCEL').run();

    return NextResponse.json({ success: true, message: '예약이 취소되었습니다.' });
  } catch (error) {
    console.error('Delete reservation error:', error);
    return NextResponse.json({ error: '예약 취소 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

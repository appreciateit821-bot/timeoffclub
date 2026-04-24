import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { isBookingClosed } from '@/lib/constants';
import { checkAndAwardBadges, cleanupOrphanedTopics } from '@/lib/badges';
import { verifyNaverOrder } from '@/lib/naver-proxy';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    if (date) {
      // 특정 날짜 예약 현황 - 공개 정보 (로그인 불필요)
      const { results: reservations } = await db.prepare('SELECT user_name, spot, mode, memo, energy, created_at FROM reservations WHERE date = ? ORDER BY created_at').bind(date).all();
      const { results: modeStats } = await db.prepare('SELECT spot, mode, COUNT(*) as count FROM reservations WHERE date = ? GROUP BY spot, mode').bind(date).all();
      return NextResponse.json({ reservations, modeStats });
    } else {
      // 개인 예약 목록 - 인증 필요
      const user = await getSession();
      if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
      
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
    const { date, spot, mode, memo, energy, smartstoreOrderId } = await request.json();
    if (!date || !spot) return NextResponse.json({ error: '날짜와 스팟을 선택해주세요.' }, { status: 400 });
    if (isBookingClosed(date)) return NextResponse.json({ error: '세션 시작 2시간 전부터는 예약할 수 없습니다.' }, { status: 400 });

    const reservationMonth = date.slice(0, 7);

    // 멤버십 활성월 체크 (체험권 유저는 제외)
    if (user.phoneLast4 && !user.phoneLast4.startsWith('T-')) {
      const member = await db.prepare('SELECT id, active_months FROM members WHERE name = ? AND phone_last4 = ?')
        .bind(user.name, user.phoneLast4).first() as any;
      if (member) {
        const activeMonths = (member.active_months || '').split(',').map((m: string) => m.trim()).filter(Boolean);
        if (!activeMonths.includes(reservationMonth)) {
          // 주문번호 미제공 → 프론트에서 입력 모달 띄우도록 안내
          if (!smartstoreOrderId) {
            return NextResponse.json({
              error: `${reservationMonth.replace('-', '년 ')}월 멤버십이 활성화되지 않았어요.`,
              needsOrderNumber: true,
              month: reservationMonth,
            }, { status: 403 });
          }

          // 주문번호 중복 사용 방지
          const used = await db.prepare('SELECT id, name FROM members WHERE smartstore_order_id = ? AND id != ?')
            .bind(smartstoreOrderId.trim(), member.id).first() as any;
          if (used) {
            return NextResponse.json({
              error: '이미 사용된 주문번호입니다. 새로 결제한 주문번호를 입력해주세요.',
              needsOrderNumber: true,
              month: reservationMonth,
            }, { status: 400 });
          }

          // 네이버 주문번호 검증
          const verify = await verifyNaverOrder(smartstoreOrderId.trim(), user.name, user.phoneLast4);
          if (!verify.ok) {
            const msg = verify.kind === 'order_invalid'
              ? '존재하지 않는 주문번호입니다. 스마트스토어 마이페이지에서 확인해주세요.'
              : '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
            return NextResponse.json({ error: msg, needsOrderNumber: true, month: reservationMonth }, { status: verify.kind === 'order_invalid' ? 400 : 503 });
          }
          if (!verify.matched) {
            const reasons: string[] = [];
            if (!verify.nameMatch) reasons.push(`주문자 이름 불일치 (주문자: ${verify.buyer.name || '확인 불가'})`);
            if (!verify.phoneMatch) reasons.push('연락처 뒷 4자리 불일치');
            if (!verify.productMatch) reasons.push(`멤버십 상품이 아님${verify.buyer.productName ? ` (주문 상품: ${verify.buyer.productName})` : ''}`);
            return NextResponse.json({
              error: '주문번호 검증 실패 — ' + reasons.join(' / '),
              needsOrderNumber: true,
              month: reservationMonth,
            }, { status: 400 });
          }

          // 검증 성공 → 해당 예약월 활성화
          const updatedMonths = [...activeMonths, reservationMonth].sort().join(',');
          await db.prepare(
            'UPDATE members SET active_months = ?, smartstore_order_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(updatedMonths, smartstoreOrderId.trim(), member.id).run();
        }
      }
    }

    // 비활성 스팟 체크 (즉시 OFF / 월 기반 OFF / 아직 활성 안 됨)
    const spotOp = await db.prepare('SELECT is_spot_active, inactive_from, active_from FROM spot_operators WHERE spot_id = ?').bind(spot).first() as any;
    if (spotOp && (
      spotOp.is_spot_active === 0 ||
      (spotOp.inactive_from && spotOp.inactive_from <= reservationMonth) ||
      (spotOp.active_from && spotOp.active_from > reservationMonth)
    )) {
      return NextResponse.json({ error: '현재 운영하지 않는 스팟입니다.' }, { status: 400 });
    }

    // 다음 달 예약 D-7 제한: 다음 달 세션은 해당 월 1일 7일 전부터 예약 가능
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
    const currentMonth = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}`;
    if (reservationMonth > currentMonth) {
      const [ry, rm] = reservationMonth.split('-').map(Number);
      const firstDay = new Date(Date.UTC(ry, rm - 1, 1));
      const bookingOpens = new Date(firstDay.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (now.getTime() < bookingOpens.getTime()) {
        const opensDate = bookingOpens.toISOString().slice(0, 10);
        return NextResponse.json({ error: `${reservationMonth.replace('-', '년 ')}월 예약은 ${opensDate}부터 가능합니다.` }, { status: 400 });
      }
    }

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
    if (existing) return NextResponse.json({ error: '같은 날에는 하나의 스팟만 예약할 수 있어요' }, { status: 400 });

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
      // 1. 특정 날짜+스팟 커스텀
      const custom = await db.prepare("SELECT max_capacity FROM session_capacity WHERE date = ? AND spot = ?").bind(date, spot).first() as any;
      if (custom) { maxCap = custom.max_capacity; }
      else {
        // 2. 스팟별 기본값
        const spotDefault = await db.prepare("SELECT max_capacity FROM session_capacity WHERE date = 'default' AND spot = ?").bind(spot).first() as any;
        if (spotDefault) { maxCap = spotDefault.max_capacity; }
        else {
          // 3. 전체 기본값
          const s = await db.prepare("SELECT value FROM settings WHERE key = 'max_capacity'").first() as any;
          if (s) maxCap = parseInt(s.value);
        }
      }
    } catch {}

    const countResult = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
    if (countResult?.count >= maxCap) return NextResponse.json({ error: '해당 스팟의 정원이 가득 찼습니다.' }, { status: 400 });

    await db.prepare('INSERT INTO reservations (user_name, date, spot, mode, memo, energy, is_trial) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(user.name, date, spot, mode || 'smalltalk', memo || '', energy || 'normal', isTrial ? 1 : 0).run();
    await db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action, phone_last4) VALUES (?, ?, ?, ?, ?)').bind(user.name, date, spot, 'CREATE', user.phoneLast4 || '').run();

    // 뱃지 체크 (비동기로 처리)
    try {
      await checkAndAwardBadges(db, user.name);
    } catch (e) {
      console.error('Badge check failed:', e);
    }
    
    // 대화 주제 정리 (비동기로 처리)
    try {
      await cleanupOrphanedTopics(db, date);
    } catch (e) {
      console.error('Topic cleanup failed:', e);
    }

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

    // 취소 전 다른 맴버 체크
    const otherMembers = await db.prepare('SELECT * FROM reservations WHERE date = ? AND spot = ? AND mode = ? AND id != ?').bind(reservation.date, reservation.spot, 'smalltalk', id).all();
    
    await db.prepare('DELETE FROM reservations WHERE id = ?').bind(id).run();
    await db.prepare('INSERT INTO reservation_logs (user_name, date, spot, action, phone_last4) VALUES (?, ?, ?, ?, ?)').bind(reservation.user_name, reservation.date, reservation.spot, 'CANCEL', user.phoneLast4 || '').run();
    
    // 2명에서 1명으로 줄어드는 경우 알림
    if (otherMembers.results && otherMembers.results.length === 1 && reservation.mode === 'smalltalk') {
      try {
        const remainingMember = otherMembers.results[0] as any;
        const spotName = reservation.spot.replace('_', ' ');
        const sessionDate = new Date(reservation.date + 'T19:00:00+09:00'); // 세션 시간 19시
        const deadline = new Date(sessionDate.getTime() - 2 * 60 * 60 * 1000); // 2시간 전
        const deadlineStr = deadline.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' ' + deadline.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
        
        await fetch('/api/admin/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: remainingMember.user_name,
            title: '하지만 대화는 계속됩니다',
            message: `${reservation.date} ${spotName}에서 한 멤버가 취소했어요. 하지만 ${deadlineStr}까지 새로운 멤버가 예약할 수 있어요. 기다려도 되고 다른 스팟으로 변경도 가능해요!`,
            priority: 'active'
          })
        });
      } catch (e) {
        console.error('Notification failed:', e);
      }
    }
    
    // 대화 주제 정리 (비동기로 처리)
    try {
      await cleanupOrphanedTopics(db, reservation.date);
    } catch (e) {
      console.error('Topic cleanup failed:', e);
    }

    return NextResponse.json({ success: true, message: '예약이 취소되었습니다.' });
  } catch (error) {
    console.error('Delete reservation error:', error);
    return NextResponse.json({ error: '예약 취소 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

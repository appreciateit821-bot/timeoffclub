import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyNaverOrder } from '@/lib/naver-proxy';

export const runtime = 'edge';

const KAKAO_GUIDE = '\n\n문의사항은 카카오톡 well__moment로 연락해주세요.';

function getNextMonthKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 2;
  if (month > 12) return `${year + 1}-01`;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  let body: { name: string; phoneLast4: string; smartstoreOrderId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const { name, phoneLast4, smartstoreOrderId } = body;
  if (!name?.trim() || !phoneLast4?.trim() || !smartstoreOrderId?.trim()) {
    return NextResponse.json({ error: `모든 항목을 입력해주세요.${KAKAO_GUIDE}` }, { status: 400 });
  }

  const member = await db
    .prepare('SELECT id, name, phone_last4, active_months, is_active, approval_status FROM members WHERE name = ? AND phone_last4 = ?')
    .bind(name.trim(), phoneLast4.trim())
    .first() as any;

  if (!member) {
    return NextResponse.json({
      error: `등록된 멤버 정보를 찾을 수 없습니다. 이름과 연락처 뒷 4자리를 확인해주세요.${KAKAO_GUIDE}`,
      notFound: true,
    }, { status: 404 });
  }

  if (member.approval_status === 'pending') {
    return NextResponse.json({ error: `가입 신청이 아직 승인 대기 중입니다.${KAKAO_GUIDE}` }, { status: 403 });
  }

  // 주문번호 중복 사용 체크
  const orderUsed = await db
    .prepare('SELECT id, name FROM members WHERE smartstore_order_id = ?')
    .bind(smartstoreOrderId.trim())
    .first() as any;

  if (orderUsed) {
    return NextResponse.json({
      error: `이미 사용된 주문번호입니다. 새로 결제한 주문번호를 입력해주세요.${KAKAO_GUIDE}`,
    }, { status: 400 });
  }

  // 네이버 주문번호 검증
  const verify = await verifyNaverOrder(smartstoreOrderId.trim(), name.trim(), phoneLast4.trim());

  if (verify.ok && verify.matched) {
    const nextMonth = getNextMonthKST();
    const currentMonths = member.active_months ? member.active_months.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    if (currentMonths.includes(nextMonth)) {
      return NextResponse.json({
        error: `${nextMonth.replace('-', '년 ')}월 멤버십이 이미 활성화되어 있습니다.${KAKAO_GUIDE}`,
      }, { status: 409 });
    }

    const updatedMonths = [...currentMonths, nextMonth].sort().join(',');

    await db.prepare(
      'UPDATE members SET active_months = ?, smartstore_order_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(updatedMonths, smartstoreOrderId.trim(), member.id).run();

    return NextResponse.json({
      success: true,
      month: nextMonth,
      message: `${nextMonth.replace('-', '년 ')}월 멤버십이 활성화되었습니다!`,
    });
  } else if (verify.ok) {
    const reasons: string[] = [];
    if (!verify.nameMatch) reasons.push(`주문자 이름이 일치하지 않아요 (주문자: ${verify.buyer.name || '확인 불가'})`);
    if (!verify.phoneMatch) reasons.push('연락처 뒷 4자리가 주문 정보와 일치하지 않아요');
    if (!verify.productMatch) reasons.push(`해당 주문번호는 멤버십 상품이 아닙니다${verify.buyer.productName ? ` (주문 상품: ${verify.buyer.productName})` : ''}`);
    return NextResponse.json({
      error: '주문번호 검증 실패 — ' + reasons.join(' / ') + KAKAO_GUIDE,
    }, { status: 400 });
  } else if (verify.kind === 'order_invalid') {
    return NextResponse.json({
      error: `존재하지 않는 주문번호입니다. 스마트스토어 마이페이지에서 주문번호를 다시 확인해주세요.${KAKAO_GUIDE}`,
    }, { status: 400 });
  } else {
    return NextResponse.json({
      error: `일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.${KAKAO_GUIDE}`,
    }, { status: 503 });
  }
}

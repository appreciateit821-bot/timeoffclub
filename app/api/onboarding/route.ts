import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { verifyNaverOrder } from '@/lib/naver-proxy';

export const runtime = 'edge';

type OnboardingBody = {
  name: string;
  phone: string;
  email: string;
  ageGender: string;
  occupation: string;
  selfIntro: string;
  reasons: string[];
  reasonOther?: string;
  expectation: string;
  agreeOffManner: boolean;
  agreePolicy: boolean;
  agreePrivacy: boolean;
  smartstoreOrderId: string;
};

function last4(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

export async function POST(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  let body: OnboardingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  // 필수값 검증
  const required = ['name', 'phone', 'email', 'ageGender', 'occupation', 'selfIntro', 'expectation', 'smartstoreOrderId'] as const;
  for (const key of required) {
    if (!body[key] || typeof body[key] !== 'string' || !(body[key] as string).trim()) {
      return NextResponse.json({ error: `${key} 항목을 입력해주세요.` }, { status: 400 });
    }
  }
  if (!body.reasons || !Array.isArray(body.reasons) || body.reasons.length === 0) {
    return NextResponse.json({ error: '타임오프클럽 선택 이유를 1개 이상 선택해주세요.' }, { status: 400 });
  }
  if (!body.agreeOffManner || !body.agreePolicy || !body.agreePrivacy) {
    return NextResponse.json({ error: '세 가지 동의 항목을 모두 체크해주세요.' }, { status: 400 });
  }

  const name = body.name.trim();
  const phoneDigits = body.phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    return NextResponse.json({ error: '올바른 연락처 형식이 아닙니다.' }, { status: 400 });
  }
  const phoneLast4 = last4(phoneDigits);

  // 중복 체크
  const existing = await db
    .prepare('SELECT id, approval_status FROM members WHERE name = ? AND phone_last4 = ?')
    .bind(name, phoneLast4)
    .first() as any;

  if (existing) {
    if (existing.approval_status === 'pending') {
      return NextResponse.json({ error: '이미 가입 신청하셨습니다. 승인 대기 중입니다.', status: 'pending' }, { status: 409 });
    }
    return NextResponse.json({ error: '이미 가입된 멤버입니다. 로그인 페이지에서 이용해주세요.' }, { status: 409 });
  }

  // 네이버 주문번호 검증
  const verify = await verifyNaverOrder(body.smartstoreOrderId.trim(), name, phoneLast4);

  let approvalStatus: 'approved' | 'pending' = 'pending';
  let verifyNote = '';

  if (verify.ok && verify.matched) {
    approvalStatus = 'approved';
  } else if (verify.ok) {
    // 일치하지 않으면 저장하지 않고 에러 반환 → 사용자에게 재확인 요청
    const reasons: string[] = [];
    if (!verify.nameMatch) reasons.push(`주문자 이름이 일치하지 않아요 (주문자: ${verify.buyer.name || '확인 불가'})`);
    if (!verify.phoneMatch) reasons.push('연락처 뒷 4자리가 주문 정보와 일치하지 않아요');
    if (!verify.productMatch) reasons.push(`해당 주문번호는 멤버십 상품이 아닙니다${verify.buyer.productName ? ` (주문 상품: ${verify.buyer.productName})` : ''}`);
    return NextResponse.json({
      error: '주문번호 검증 실패 — ' + reasons.join(' / '),
      hint: '멤버십 결제가 맞는지 확인하거나, 스마트스토어 마이페이지에서 주문번호를 다시 확인 후 재시도해주세요.',
      reasons,
    }, { status: 400 });
  } else if (verify.kind === 'order_invalid') {
    // 네이버가 주문번호를 찾지 못함 (존재하지 않거나 권한 없음) → 저장 없이 거부
    return NextResponse.json({
      error: '존재하지 않는 주문번호입니다. 스마트스토어 마이페이지에서 주문번호를 다시 확인해주세요.',
      hint: '네이버 스마트스토어에서 멤버십 결제가 완료된 주문번호를 입력해주세요.',
    }, { status: 400 });
  } else {
    // 일시적 네트워크/서버 오류 → pending으로 저장 후 수동 검토
    verifyNote = `verify_error: ${verify.error}`;
  }

  const now = new Date().toISOString();
  const reasonsJson = JSON.stringify(body.reasonOther?.trim()
    ? [...body.reasons, `기타: ${body.reasonOther.trim()}`]
    : body.reasons);

  await db.prepare(
    `INSERT INTO members
      (name, phone_last4, phone, email, age_gender, occupation, self_intro, reasons, expectation,
       smartstore_order_id, approval_status, onboarded_at, agreements_at, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(
    name,
    phoneLast4,
    phoneDigits,
    body.email.trim(),
    body.ageGender,
    body.occupation.trim(),
    body.selfIntro.trim(),
    reasonsJson,
    body.expectation.trim(),
    body.smartstoreOrderId.trim(),
    approvalStatus,
    now,
    now,
    now,
    now,
  ).run();

  if (approvalStatus === 'approved') {
    await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 0)').bind(name).run();
    await createSession({ name, isAdmin: false, isSpotOperator: false, phoneLast4 });
    return NextResponse.json({ success: true, status: 'approved', redirectUrl: '/calendar' });
  }

  return NextResponse.json({ success: true, status: 'pending', note: verifyNote });
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  try {
    const { name, password, phoneLast4 } = await request.json();

    // 관리자/스팟운영자 로그인
    if (password) {
      const { isValid, isAdmin, isSpotOperator, spotId } = verifyPassword(password);
      if (!isValid) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });

      if (isAdmin) {
        await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 1)').bind(name || '관리자').run();
        await createSession({ name: name || '관리자', isAdmin: true, isSpotOperator: false });
        return NextResponse.json({ success: true, user: { name: name || '관리자', isAdmin: true }, redirectUrl: '/admin' });
      }

      if (isSpotOperator && spotId) {
        await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 0)').bind(spotId).run();
        await createSession({ name: spotId, isAdmin: false, isSpotOperator: true, spotId });
        return NextResponse.json({ success: true, user: { name: spotId, isSpotOperator: true, spotId }, redirectUrl: '/admin/spot' });
      }
    }

    if (!name) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });

    // 체험권 로그인
    if (phoneLast4 && phoneLast4.startsWith('T-')) {
      const ticket = await db.prepare('SELECT * FROM trial_tickets WHERE code = ?').bind(phoneLast4).first();
      if (!ticket) return NextResponse.json({ error: '유효하지 않은 체험권 코드입니다.' }, { status: 403 });

      // 사용되지 않은 체험권만 이름 업데이트
      if (!ticket.is_used) {
        await db.prepare('UPDATE trial_tickets SET name = ? WHERE id = ?').bind(name, ticket.id).run();
      }
      // 사용된 체험권은 기존 이름 사용
      const finalName = ticket.is_used ? ticket.name : name;
      await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 0)').bind(finalName).run();
      await createSession({ name: finalName, isAdmin: false, isSpotOperator: false, phoneLast4 });
      return NextResponse.json({ success: true, user: { name: finalName, isTrial: true }, redirectUrl: '/calendar' });
    }

    // 일반 멤버 로그인
    if (!phoneLast4) return NextResponse.json({ error: '연락처 뒷 4자리 또는 체험권 코드를 입력해주세요.' }, { status: 400 });

    const member = await db.prepare('SELECT * FROM members WHERE name = ? AND phone_last4 = ?').bind(name, phoneLast4).first() as any;
    if (!member) {
      // 매칭 없음 → 첫 가입 안내
      return NextResponse.json({
        isNewUser: true,
        message: '처음 이용하시나요? 간단한 가입 폼을 작성해주세요.',
        redirectUrl: '/onboarding'
      }, { status: 200 });
    }

    // 승인 대기
    if (member.approval_status === 'pending') {
      return NextResponse.json({
        error: '가입 신청이 승인 대기 중입니다. 운영진 확인 후 안내드릴게요 🦊',
        status: 'pending'
      }, { status: 403 });
    }

    // 활성 상태 체크
    if (!member.is_active) {
      return NextResponse.json({ error: '멤버십이 비활성 상태입니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    // 활성 월 체크 — 현재 월 또는 미래 활성월이 있으면 로그인 허용
    if (member.active_months) {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
      const currentMonth = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}`;
      const activeMonths = member.active_months.split(',').map((m: string) => m.trim());
      // 현재 월 이상의 활성월이 하나라도 있으면 OK
      const hasValidMonth = activeMonths.some((m: string) => m >= currentMonth);
      if (!hasValidMonth) {
        return NextResponse.json({ error: `멤버십이 만료되었습니다. 스마트스토어에서 멤버십 결제 후 로그인해주세요.\n\n문의: 카카오톡 well__moment` }, { status: 403 });
      }
    }

    await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 0)').bind(name).run();
    await createSession({ name, isAdmin: false, isSpotOperator: false, phoneLast4 });
    return NextResponse.json({ success: true, user: { name }, redirectUrl: '/calendar' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '로그인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

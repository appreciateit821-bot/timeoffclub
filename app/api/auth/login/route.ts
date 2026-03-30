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
      const ticket = await db.prepare('SELECT * FROM trial_tickets WHERE code = ? AND is_used = 0').bind(phoneLast4).first();
      if (!ticket) return NextResponse.json({ error: '유효하지 않거나 이미 사용된 체험권입니다.' }, { status: 403 });

      await db.prepare('UPDATE trial_tickets SET name = ? WHERE id = ?').bind(name, ticket.id).run();
      await db.prepare('INSERT OR REPLACE INTO users (name, is_admin) VALUES (?, 0)').bind(name).run();
      await createSession({ name, isAdmin: false, isSpotOperator: false, phoneLast4 });
      return NextResponse.json({ success: true, user: { name, isTrial: true }, redirectUrl: '/calendar' });
    }

    // 일반 멤버 로그인
    if (!phoneLast4) return NextResponse.json({ error: '연락처 뒷 4자리 또는 체험권 코드를 입력해주세요.' }, { status: 400 });

    const member = await db.prepare('SELECT * FROM members WHERE name = ? AND phone_last4 = ?').bind(name, phoneLast4).first() as any;
    if (!member) return NextResponse.json({ error: '등록되지 않은 멤버입니다. 관리자 (카카오톡 well__moment)로 연락 부탁드립니다 🦊' }, { status: 403 });

    // 활성 상태 체크
    if (!member.is_active) {
      return NextResponse.json({ error: '멤버십이 비활성 상태입니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    // 활성 월 체크 (active_months가 설정된 경우)
    if (member.active_months) {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
      const currentMonth = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}`;
      const activeMonths = member.active_months.split(',').map((m: string) => m.trim());
      if (!activeMonths.includes(currentMonth)) {
        return NextResponse.json({ error: `${currentMonth} 멤버십이 활성화되지 않았습니다. 관리자에게 문의하세요.` }, { status: 403 });
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

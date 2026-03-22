import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

export async function POST(request: NextRequest) {
  try {
    const { name, password, phoneLast4 } = await request.json();

    // 관리자/스팟운영자 로그인 (비밀번호 사용)
    if (password) {
      const { isValid, isAdmin, isSpotOperator, spotId } = verifyPassword(password);

      if (!isValid) {
        return NextResponse.json(
          { error: '비밀번호가 올바르지 않습니다.' },
          { status: 401 }
        );
      }

      // 슈퍼관리자 로그인
      if (isAdmin) {
        const stmt = db.prepare(`
          INSERT INTO users (name, is_admin) VALUES (?, 1)
          ON CONFLICT(name) DO UPDATE SET is_admin = 1
        `);
        stmt.run(name || '관리자');

        await createSession({
          name: name || '관리자',
          isAdmin: true,
          isSpotOperator: false
        });

        return NextResponse.json({
          success: true,
          user: { name: name || '관리자', isAdmin: true, isSpotOperator: false },
          redirectUrl: '/admin'
        });
      }

      // 스팟 운영자 로그인
      if (isSpotOperator && spotId) {
        const stmt = db.prepare(`
          INSERT INTO users (name, is_admin) VALUES (?, 0)
          ON CONFLICT(name) DO UPDATE SET is_admin = 0
        `);
        stmt.run(spotId);

        await createSession({
          name: spotId,
          isAdmin: false,
          isSpotOperator: true,
          spotId
        });

        return NextResponse.json({
          success: true,
          user: { name: spotId, isAdmin: false, isSpotOperator: true, spotId },
          redirectUrl: '/admin/spot'
        });
      }
    }

    // 일반 멤버 또는 체험권 로그인
    if (!name) {
      return NextResponse.json(
        { error: '이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 체험권 코드로 로그인 시도
    if (phoneLast4 && phoneLast4.startsWith('T-')) {
      const ticketStmt = db.prepare(`
        SELECT * FROM trial_tickets WHERE code = ? AND is_used = 0
      `);
      const ticket = ticketStmt.get(phoneLast4) as any;

      if (!ticket) {
        return NextResponse.json(
          { error: '유효하지 않거나 이미 사용된 체험권입니다.' },
          { status: 403 }
        );
      }

      // 체험권에 이름 기록
      db.prepare('UPDATE trial_tickets SET name = ? WHERE id = ?').run(name, ticket.id);

      const userStmt = db.prepare(`
        INSERT INTO users (name, is_admin) VALUES (?, 0)
        ON CONFLICT(name) DO UPDATE SET is_admin = 0
      `);
      userStmt.run(name);

      await createSession({
        name,
        isAdmin: false,
        isSpotOperator: false,
        phoneLast4: phoneLast4
      });

      return NextResponse.json({
        success: true,
        user: { name, isAdmin: false, isSpotOperator: false, isTrial: true },
        redirectUrl: '/calendar'
      });
    }

    // 일반 멤버 로그인 (이름 + 뒷4자리)
    if (!phoneLast4) {
      return NextResponse.json(
        { error: '연락처 뒷 4자리 또는 체험권 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // members 테이블에서 활성 멤버 확인
    const memberStmt = db.prepare(`
      SELECT * FROM members
      WHERE name = ? AND phone_last4 = ? AND is_active = 1
    `);
    const member = memberStmt.get(name, phoneLast4) as any;

    if (!member) {
      return NextResponse.json(
        { error: '등록되지 않은 멤버입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    const userStmt = db.prepare(`
      INSERT INTO users (name, is_admin) VALUES (?, 0)
      ON CONFLICT(name) DO UPDATE SET is_admin = 0
    `);
    userStmt.run(name);

    await createSession({
      name,
      isAdmin: false,
      isSpotOperator: false,
      phoneLast4
    });

    return NextResponse.json({
      success: true,
      user: { name, isAdmin: false, isSpotOperator: false },
      redirectUrl: '/calendar'
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

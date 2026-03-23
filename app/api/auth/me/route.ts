import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // 멤버인 경우 active_months 조회
  if (!session.isAdmin && !session.isSpotOperator && session.phoneLast4) {
    const db = getDB();
    if (db) {
      const member = await db.prepare('SELECT active_months FROM members WHERE name = ? AND phone_last4 = ?')
        .bind(session.name, session.phoneLast4).first() as any;
      if (member) {
        return NextResponse.json({
          user: {
            ...session,
            activeMonths: member.active_months || ''
          }
        });
      }
    }
  }

  return NextResponse.json({ user: session });
}

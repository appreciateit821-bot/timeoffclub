import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results } = await db.prepare(
    `SELECT id, name, phone_last4, phone, email, age_gender, occupation, self_intro,
            reasons, expectation, smartstore_order_id, approval_status, onboarded_at, rejected_reason
     FROM members WHERE approval_status = 'pending' ORDER BY onboarded_at DESC`
  ).all();

  return NextResponse.json({ pendingMembers: results });
}

export async function PATCH(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { memberId, action, reason } = await request.json() as { memberId: number; action: 'approve' | 'reject'; reason?: string };

  const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(memberId).first() as any;
  if (!member) return NextResponse.json({ error: '멤버 없음' }, { status: 404 });
  if (member.approval_status !== 'pending') return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 });

  if (action === 'approve') {
    await db.prepare(`UPDATE members SET approval_status = 'approved' WHERE id = ?`).bind(memberId).run();
    return NextResponse.json({ success: true, status: 'approved' });
  }

  if (action === 'reject') {
    await db.prepare(`UPDATE members SET approval_status = 'rejected', rejected_reason = ?, is_active = 0 WHERE id = ?`)
      .bind(reason || '', memberId).run();
    return NextResponse.json({ success: true, status: 'rejected' });
  }

  return NextResponse.json({ error: '잘못된 action' }, { status: 400 });
}

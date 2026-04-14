import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations ORDER BY date DESC, spot').all();

  // 이름 → 뒷4자리 매핑
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });

  // 체험권 사용자 매핑 (name → trial ticket code)
  const { results: trials } = await db.prepare('SELECT name, code, phone_last4 FROM trial_tickets WHERE name IS NOT NULL').all();
  const nameToTrial: { [name: string]: { code: string; phone_last4: string | null } } = {};
  (trials as any[]).forEach(t => { nameToTrial[t.name] = { code: t.code, phone_last4: t.phone_last4 }; });

  const masked = (reservations as any[]).map(r => {
    const memberPhone = nameToPhone[r.user_name];
    const trial = nameToTrial[r.user_name];
    const isTrial = !memberPhone && !!trial;
    return {
      ...r,
      display_id: memberPhone || trial?.phone_last4 || trial?.code || '****',
      is_trial: isTrial,
      user_name: r.user_name
    };
  });
  return NextResponse.json({ reservations: masked });
}

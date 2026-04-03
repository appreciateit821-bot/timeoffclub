import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if ((!session?.isSpotOperator && !session?.isAdmin) || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE spot = ? ORDER BY date DESC').bind(session.spotId || session.name).all();
  const { results: members } = await db.prepare('SELECT name, phone_last4 FROM members').all();
  
  // 일반 멤버 전화번호 매핑
  const nameToPhone: { [name: string]: string } = {};
  (members as any[]).forEach(m => { nameToPhone[m.name] = m.phone_last4; });
  
  // 체험권 사용자의 전화번호 추가 (체험권 코드에서 추출)
  const { results: trialTickets } = await db.prepare('SELECT name, code FROM trial_tickets WHERE is_used = 1 AND name IS NOT NULL').all();
  (trialTickets as any[]).forEach((ticket: any) => {
    if (ticket.name && ticket.code) {
      // T-I0W2G3 → 2336 (뒤 4자리)
      nameToPhone[ticket.name] = ticket.code.slice(-4);
    }
  });
  
  const masked = (reservations as any[]).map(r => ({ 
    ...r, 
    display_id: nameToPhone[r.user_name] || '****',
    is_trial_display: r.is_trial ? '체험권' : null
  }));
  
  return NextResponse.json({ reservations: masked });
}

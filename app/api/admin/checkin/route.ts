import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  const { results: reservations } = date
    ? await db.prepare('SELECT * FROM reservations WHERE date = ? ORDER BY spot, created_at ASC').bind(date).all()
    : await db.prepare("SELECT * FROM reservations WHERE date >= date('now', '-30 days') ORDER BY date DESC, spot, created_at ASC").all();

  const { results: noShowStats } = await db.prepare("SELECT user_name, COUNT(*) as no_show_count FROM reservations WHERE check_in_status = 'no_show' GROUP BY user_name ORDER BY no_show_count DESC").all();
  const { results: stats } = await db.prepare("SELECT check_in_status, COUNT(*) as count FROM reservations WHERE date >= date('now', '-30 days') GROUP BY check_in_status").all();

  return NextResponse.json({ reservations, noShowStats, stats });
}

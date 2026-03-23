import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations ORDER BY date DESC, spot').all();

  const BOM = '\uFEFF';
  const header = '날짜,스팟,이름,모드,에너지,메모,체크인상태,예약일시\n';
  const rows = (reservations as any[]).map(r =>
    `${r.date},${r.spot},${r.user_name},${r.mode || 'smalltalk'},${r.energy || 'normal'},"${(r.memo || '').replace(/"/g, '""')}",${r.check_in_status},${r.created_at}`
  ).join('\n');

  return new NextResponse(BOM + header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

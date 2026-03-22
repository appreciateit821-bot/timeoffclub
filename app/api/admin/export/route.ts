import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { initDB } from '@/lib/db';

initDB();

// CSV 내보내기 (관리자)
export async function GET() {
  const user = await getSession();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const stmt = db.prepare(`
      SELECT
        user_name as '이름',
        date as '날짜',
        spot as '스팟',
        created_at as '예약일시'
      FROM reservations
      ORDER BY date DESC, spot, user_name
    `);
    const reservations = stmt.all() as any[];

    // CSV 생성
    const headers = ['이름', '날짜', '스팟', '예약일시'];
    const csvRows = [headers.join(',')];

    for (const row of reservations) {
      const values = [
        row['이름'],
        row['날짜'],
        `"${row['스팟']}"`, // 쉼표가 포함될 수 있으므로 따옴표로 감싸기
        row['예약일시']
      ];
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');

    // UTF-8 BOM 추가 (Excel에서 한글이 깨지지 않도록)
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reservations_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { error: 'CSV 내보내기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

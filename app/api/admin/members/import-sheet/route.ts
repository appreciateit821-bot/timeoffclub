import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { sheetUrl } = await request.json();
  if (!sheetUrl) return NextResponse.json({ error: 'URL 필요' }, { status: 400 });

  try {
    const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    if (!idMatch) return NextResponse.json({ error: '올바른 구글 스프레드시트 URL이 아닙니다.' }, { status: 400 });

    const csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq?tqx=out:csv&gid=${gidMatch ? gidMatch[1] : '0'}`;
    const response = await fetch(csvUrl);
    if (!response.ok) return NextResponse.json({ error: '시트를 가져올 수 없습니다.' }, { status: 400 });

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    if (rows.length < 2) return NextResponse.json({ error: '데이터 없음' }, { status: 400 });

    const header = rows[0].map(h => h.trim());
    let nameIdx = header.findIndex(h => h === '성함');
    let phoneIdx = header.findIndex(h => h === '연락처');
    if (nameIdx === -1) nameIdx = 1;
    if (phoneIdx === -1) phoneIdx = 2;

    // 현재 월 (KST)
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
    const currentMonth = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;

    let added = 0, updated = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const name = rows[i][nameIdx]?.trim();
      const phone = rows[i][phoneIdx]?.trim().replace(/[^0-9]/g, '');
      if (!name || !phone || phone.length < 4) { skipped++; continue; }

      try {
        const phoneLast4 = phone.slice(-4);
        const existing = await db.prepare('SELECT id, active_months FROM members WHERE name = ? AND phone_last4 = ?').bind(name, phoneLast4).first() as any;

        if (existing) {
          // 중복 = 재결제 → 활성월 추가 + 활성화
          const months = existing.active_months ? existing.active_months.split(',').map((s: string) => s.trim()) : [];
          if (!months.includes(currentMonth)) months.push(currentMonth);
          await db.prepare('UPDATE members SET active_months = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(months.join(','), existing.id).run();
          updated++;
        } else {
          // 신규 멤버
          await db.prepare('INSERT INTO members (name, phone_last4, is_active, active_months) VALUES (?, ?, 1, ?)')
            .bind(name, phoneLast4, currentMonth).run();
          added++;
        }
      } catch { skipped++; }
    }

    return NextResponse.json({ success: true, added, updated, skipped, total: rows.length - 1 });
  } catch (error) {
    return NextResponse.json({ error: '가져오기 오류' }, { status: 500 });
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let current = ''; let inQuotes = false; let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const next = text[i + 1];
    if (inQuotes) { if (char === '"' && next === '"') { current += '"'; i++; } else if (char === '"') { inQuotes = false; } else { current += char; } }
    else { if (char === '"') { inQuotes = true; } else if (char === ',') { row.push(current); current = ''; } else if (char === '\n' || (char === '\r' && next === '\n')) { row.push(current); current = ''; rows.push(row); row = []; if (char === '\r') i++; } else { current += char; } }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }
  return rows;
}

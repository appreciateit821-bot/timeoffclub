import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

initDB();

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { sheetUrl } = await request.json();

  if (!sheetUrl) {
    return NextResponse.json({ error: '구글 시트 URL을 입력해주세요.' }, { status: 400 });
  }

  try {
    // 구글 시트 URL에서 ID와 GID 추출
    const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    
    if (!idMatch) {
      return NextResponse.json({ error: '올바른 구글 스프레드시트 URL이 아닙니다.' }, { status: 400 });
    }

    const sheetId = idMatch[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

    // CSV 가져오기
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return NextResponse.json({ error: '구글 시트를 가져올 수 없습니다. 시트가 공개되어 있는지 확인해주세요.' }, { status: 400 });
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json({ error: '시트에 데이터가 없습니다.' }, { status: 400 });
    }

    // 헤더 행으로 컬럼 인덱스 찾기
    const header = rows[0].map(h => h.trim());
    let nameIdx = header.findIndex(h => h === '성함');
    let phoneIdx = header.findIndex(h => h === '연락처');
    
    // 못 찾으면 기본 인덱스 (2번째=성함, 3번째=연락처)
    if (nameIdx === -1) nameIdx = 1;
    if (phoneIdx === -1) phoneIdx = 2;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO members (name, phone_last4, is_active)
      VALUES (?, ?, 1)
    `);

    let added = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx]?.trim();
      const phone = row[phoneIdx]?.trim().replace(/[^0-9]/g, '');

      if (!name || !phone || phone.length < 4) {
        skipped++;
        continue;
      }

      const phoneLast4 = phone.slice(-4);

      try {
        const result = insertStmt.run(name, phoneLast4);
        if (result.changes > 0) {
          added++;
        } else {
          skipped++;
        }
      } catch (e) {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      total: rows.length - 1
    });
  } catch (error) {
    console.error('Sheet import error:', error);
    return NextResponse.json({ error: '시트 가져오기 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 간단한 CSV 파서
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        rows.push(row);
        row = [];
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

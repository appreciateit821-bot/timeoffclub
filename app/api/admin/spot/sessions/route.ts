import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { AVAILABLE_DAYS } from '@/lib/constants';

export const runtime = 'edge';

// 해당 월의 수/일 날짜 목록 구하기
function getSessionDates(year: number, month: number): { date: string; day: 'wed' | 'sun' }[] {
  const dates: { date: string; day: 'wed' | 'sun' }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === AVAILABLE_DAYS.WEDNESDAY) {
      dates.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: 'wed' });
    } else if (dow === AVAILABLE_DAYS.SUNDAY) {
      dates.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: 'sun' });
    }
  }
  return dates;
}

// GET: 다음 달 세션 현황 (닫힌 날짜 + 예약수 + 인원 설정)
export async function GET(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('month'); // 'YYYY-MM'

  // 다음 달 계산 (기본값)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let year: number, month: number;
  if (yearMonth) {
    [year, month] = yearMonth.split('-').map(Number);
  } else {
    year = kst.getUTCFullYear();
    month = kst.getUTCMonth() + 2; // 다음 달
    if (month > 12) { year++; month = 1; }
  }

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const sessionDates = getSessionDates(year, month);
  const spot = session.spotId;

  // 닫힌 날짜 조회
  const closedRows = await db.prepare(
    "SELECT date FROM closed_dates WHERE spot = ? AND date LIKE ? || '%'"
  ).bind(spot, monthStr).all() as any;
  const closedSet = new Set((closedRows.results || []).map((r: any) => r.date));

  // 예약수 조회
  const resvRows = await db.prepare(
    "SELECT date, COUNT(*) as cnt FROM reservations WHERE spot = ? AND date LIKE ? || '%' GROUP BY date"
  ).bind(spot, monthStr).all() as any;
  const resvMap = new Map((resvRows.results || []).map((r: any) => [r.date, r.cnt]));

  // 인원 설정 조회
  const capRows = await db.prepare(
    "SELECT date, max_capacity FROM session_capacity WHERE spot = ? AND (date LIKE ? || '%' OR date = 'default')"
  ).bind(spot, monthStr).all() as any;
  let defaultCap = 10;
  const capMap = new Map<string, number>();
  for (const r of (capRows.results || [])) {
    if (r.date === 'default') defaultCap = r.max_capacity;
    else capMap.set(r.date, r.max_capacity);
  }

  // D-14 체크: 다음 달 1일 14일 전부터 조정 가능
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const canEditFrom = new Date(firstDay.getTime() - 14 * 24 * 60 * 60 * 1000);
  const canEdit = kst.getTime() >= canEditFrom.getTime();

  const sessions = sessionDates.map(sd => ({
    date: sd.date,
    day: sd.day,
    isClosed: closedSet.has(sd.date),
    reservationCount: resvMap.get(sd.date) || 0,
    maxCapacity: capMap.get(sd.date) || defaultCap,
  }));

  // 열린 세션 중 수/일 카운트
  const openWed = sessions.filter(s => !s.isClosed && s.day === 'wed').length;
  const openSun = sessions.filter(s => !s.isClosed && s.day === 'sun').length;

  return NextResponse.json({
    month: monthStr,
    spot,
    sessions,
    canEdit,
    canEditFrom: canEditFrom.toISOString().slice(0, 10),
    openCount: { wed: openWed, sun: openSun, total: openWed + openSun },
    defaultCapacity: defaultCap,
  });
}

// POST: 세션 닫기/열기
export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isSpotOperator) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { date, action } = await request.json(); // action: 'close' | 'open'
  if (!date || !action) return NextResponse.json({ error: '날짜와 action 필요' }, { status: 400 });

  const spot = session.spotId;

  // D-14 체크
  const [y, m] = date.split('-').map(Number);
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const canEditFrom = new Date(firstDay.getTime() - 14 * 24 * 60 * 60 * 1000);
  if (kst.getTime() < canEditFrom.getTime()) {
    return NextResponse.json({ error: `${canEditFrom.toISOString().slice(0, 10)}부터 조정 가능합니다.` }, { status: 400 });
  }

  if (action === 'close') {
    // 예약자 있으면 닫기 불가
    const resv = await db.prepare('SELECT COUNT(*) as cnt FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
    if (resv && resv.cnt > 0) {
      return NextResponse.json({ error: `예약자가 ${resv.cnt}명 있어 닫을 수 없습니다.` }, { status: 400 });
    }

    // 최소 2회 (수1+일1) 유지 체크
    const monthStr = date.slice(0, 7);
    const [yr, mn] = monthStr.split('-').map(Number);
    const allDates = getSessionDates(yr, mn);

    const closedRows = await db.prepare(
      "SELECT date FROM closed_dates WHERE spot = ? AND date LIKE ? || '%'"
    ).bind(spot, monthStr).all() as any;
    const closedSet = new Set((closedRows.results || []).map((r: any) => r.date));
    closedSet.add(date); // 이번 닫기 포함

    const openWed = allDates.filter(d => d.day === 'wed' && !closedSet.has(d.date)).length;
    const openSun = allDates.filter(d => d.day === 'sun' && !closedSet.has(d.date)).length;

    if (openWed < 1) return NextResponse.json({ error: '수요일 세션을 최소 1회 이상 유지해야 합니다.' }, { status: 400 });
    if (openSun < 1) return NextResponse.json({ error: '일요일 세션을 최소 1회 이상 유지해야 합니다.' }, { status: 400 });

    await db.prepare(
      'INSERT OR IGNORE INTO closed_dates (date, spot, reason) VALUES (?, ?, ?)'
    ).bind(date, spot, '운영자 일정 조정').run();

    return NextResponse.json({ success: true, action: 'closed' });
  }

  if (action === 'open') {
    await db.prepare('DELETE FROM closed_dates WHERE date = ? AND spot = ?').bind(date, spot).run();
    return NextResponse.json({ success: true, action: 'opened' });
  }

  return NextResponse.json({ error: 'action은 close 또는 open이어야 합니다.' }, { status: 400 });
}

import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db';
import { getSessionStartTime, getSessionEndTime, SPOT_DETAILS } from '@/lib/constants';

initDB();

// 구독형 캘린더 (ICS feed) - 토큰으로 인증
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userName = searchParams.get('user');
  const token = searchParams.get('token');

  if (!userName || !token) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  // 간단한 토큰 검증 (이름 base64)
  const expectedToken = Buffer.from(userName).toString('base64url');
  if (token !== expectedToken) {
    return new NextResponse('Invalid token', { status: 401 });
  }

  const reservations = db.prepare(`
    SELECT * FROM reservations WHERE user_name = ? ORDER BY date
  `).all(userName) as any[];

  const formatICSDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const now = formatICSDate(new Date());

  const events = reservations.map(r => {
    const spotInfo = SPOT_DETAILS.find(s => s.id === r.spot);
    const startTime = getSessionStartTime(r.date);
    const endTime = getSessionEndTime(r.date);
    const uid = `timeoffclub-${r.id}-${r.date}@timeoffclub`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatICSDate(startTime)}`,
      `DTEND:${formatICSDate(endTime)}`,
      `SUMMARY:타임오프클럽 - ${spotInfo?.name || r.spot}`,
      `DESCRIPTION:타임오프클럽 세션\\n장소: ${spotInfo?.name || r.spot}\\n주소: ${spotInfo?.address || ''}\\n할인: ${spotInfo?.discount || ''}\\n\\n☕ 1인 1음료 주문\\n📵 스마트폰 보관`,
      `LOCATION:${spotInfo?.address || r.spot}`,
      `URL:${spotInfo?.mapUrl || ''}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT3H',
      'ACTION:DISPLAY',
      `DESCRIPTION:타임오프클럽 3시간 후 시작!`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:타임오프클럽 1시간 후 시작!`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//타임오프클럽//Reservation//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:타임오프클럽',
    'X-WR-TIMEZONE:Asia/Seoul',
    `REFRESH-INTERVAL;VALUE=DURATION:PT1H`,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

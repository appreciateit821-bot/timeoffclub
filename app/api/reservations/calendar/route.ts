import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSessionStartTime, getSessionEndTime, SPOT_DETAILS } from '@/lib/constants';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  await initDB();
  const db = getDB();
  if (!db) return new NextResponse('DB error', { status: 500 });

  const { searchParams } = new URL(request.url);
  const userName = searchParams.get('user');
  const token = searchParams.get('token');
  if (!userName || !token) return new NextResponse('Missing parameters', { status: 400 });

  const expectedToken = btoa(userName).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  if (token !== expectedToken) return new NextResponse('Invalid token', { status: 401 });

  const { results: reservations } = await db.prepare('SELECT * FROM reservations WHERE user_name = ? ORDER BY date').bind(userName).all();
  const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const events = (reservations as any[]).map(r => {
    const spotInfo = SPOT_DETAILS.find(s => s.id === r.spot);
    const startTime = getSessionStartTime(r.date);
    const endTime = getSessionEndTime(r.date);
    return [
      'BEGIN:VEVENT',`UID:timeoffclub-${r.id}@timeoffclub`,`DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startTime)}`,`DTEND:${formatICSDate(endTime)}`,
      `SUMMARY:타임오프클럽 - ${spotInfo?.name || r.spot}`,
      `LOCATION:${spotInfo?.address || r.spot}`,
      'BEGIN:VALARM','TRIGGER:-PT3H','ACTION:DISPLAY','DESCRIPTION:타임오프클럽 3시간 후!','END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  });

  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//타임오프클럽//KO','X-WR-CALNAME:타임오프클럽','REFRESH-INTERVAL;VALUE=DURATION:PT1H',...events,'END:VCALENDAR'].join('\r\n');
  return new NextResponse(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' } });
}

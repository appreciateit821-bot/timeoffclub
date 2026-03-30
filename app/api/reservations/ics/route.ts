import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { getSessionStartTime, getSessionEndTime, SPOT_DETAILS } from '@/lib/constants';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');
  const cancel = searchParams.get('cancel') === '1';
  if (!date || !spot) return NextResponse.json({ error: '날짜와 스팟을 지정해주세요.' }, { status: 400 });

  const spotInfo = SPOT_DETAILS.find(s => s.id === spot);
  const startTime = getSessionStartTime(date);
  const endTime = getSessionEndTime(date);
  const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `timeoffclub-${date}-${encodeURIComponent(spot)}-${session.name}@timeoffclub`;

  // 스팟 안내 메시지 조회
  let spotNotice = '';
  try {
    const db = getDB();
    if (db) {
      const notice = await db.prepare('SELECT notice FROM spot_notices WHERE spot = ?').bind(spot).first() as any;
      if (notice?.notice) spotNotice = notice.notice;
    }
  } catch {}

  const method = cancel ? 'CANCEL' : 'PUBLISH';
  const status = cancel ? 'CANCELLED' : 'CONFIRMED';
  const desc = [
    `장소: ${spotInfo?.name || spot}`,
    `주소: ${spotInfo?.address || ''}`,
    '',
    '☕ 1인 1음료',
    '📵 스마트폰 보관',
    spotNotice ? `\\nℹ️ ${spotNotice}` : '',
  ].filter(Boolean).join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//타임오프클럽//KO','CALSCALE:GREGORIAN',`METHOD:${method}`,
    'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${formatICSDate(new Date())}`,`STATUS:${status}`,
    `DTSTART:${formatICSDate(startTime)}`,`DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${cancel ? '[취소됨] ' : ''}타임오프클럽 - ${spotInfo?.name || spot}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${spotInfo?.address || spot}`,`URL:${spotInfo?.mapUrl || ''}`,
    'BEGIN:VALARM','TRIGGER:-PT5H','ACTION:DISPLAY','DESCRIPTION:타임오프클럽까지 5시간! 멤버들이 기다리고 있으니 정시 참석 부탁드려요❤️','END:VALARM',
    'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY','DESCRIPTION:타임오프클럽 1시간 후!','END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');

  return new NextResponse(icsContent, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="timeoffclub-${date}${cancel ? '-cancel' : ''}.ics"` },
  });
}

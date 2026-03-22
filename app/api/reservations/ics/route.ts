import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSessionStartTime, getSessionEndTime, SPOT_DETAILS } from '@/lib/constants';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');
  if (!date || !spot) return NextResponse.json({ error: '날짜와 스팟을 지정해주세요.' }, { status: 400 });

  const spotInfo = SPOT_DETAILS.find(s => s.id === spot);
  const startTime = getSessionStartTime(date);
  const endTime = getSessionEndTime(date);
  const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `timeoffclub-${date}-${encodeURIComponent(spot)}-${session.name}@timeoffclub`;

  const icsContent = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//타임오프클럽//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startTime)}`,`DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:타임오프클럽 - ${spotInfo?.name || spot}`,
    `DESCRIPTION:장소: ${spotInfo?.name || spot}\\n주소: ${spotInfo?.address || ''}\\n\\n☕ 1인 1음료\\n📵 스마트폰 보관`,
    `LOCATION:${spotInfo?.address || spot}`,`URL:${spotInfo?.mapUrl || ''}`,
    'BEGIN:VALARM','TRIGGER:-PT3H','ACTION:DISPLAY','DESCRIPTION:타임오프클럽 3시간 후!','END:VALARM',
    'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY','DESCRIPTION:타임오프클럽 1시간 후!','END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');

  return new NextResponse(icsContent, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="timeoffclub-${date}.ics"` },
  });
}

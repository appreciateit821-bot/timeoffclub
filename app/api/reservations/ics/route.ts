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

  // 스팟 안내 메시지 조회 및 예약 현황 확인
  let spotNotice = '';
  let reservationCount = 0;
  try {
    const db = getDB();
    if (db) {
      const notice = await db.prepare('SELECT notice FROM spot_notices WHERE spot = ?').bind(spot).first() as any;
      if (notice?.notice) spotNotice = notice.notice;
      
      // 해당 날짜/스팟의 예약 인원 수 확인
      const countResult = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
      reservationCount = countResult?.count || 0;
    }
  } catch {}

  const method = cancel ? 'CANCEL' : 'PUBLISH';
  const status = cancel ? 'CANCELLED' : 'CONFIRMED';

  // 벤슨 테이스팅 라운지 특별 안내
  const bensonNote = spot === '압구정로데오_벤슨 테이스팅 라운지' ? '🏢 엘리베이터 타고 2층으로 올라와주세요' : '';

  const desc = [
    `장소: ${spotInfo?.name || spot}`,
    `주소: ${spotInfo?.address || ''}`,
    '',
    '☕ 1인 1음료',
    '📵 스마트폰 보관',
    bensonNote ? `\\n${bensonNote}` : '',
    spotNotice ? `\\nℹ️ ${spotNotice}` : '',
  ].filter(Boolean).join('\\n');

  // 캘린더 알림 메시지 생성 (인원수 정보 제거, 실용적 타이밍)
  const getAlarmMessage = (hoursBeforeStart: number) => {
    if (hoursBeforeStart === 3) {
      return '오늘 타임오프클럽 참석인원을 확인해주세요! 📍 timeoffclub.pages.dev';
    } else if (hoursBeforeStart === 1) {
      return '🚨 타임오프클럽 1시간 전! 출발 준비 부탁드려요!';
    }
    return '타임오프클럽 알림';
  };

  const icsContent = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//타임오프클럽//KO','CALSCALE:GREGORIAN',`METHOD:${method}`,
    'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${formatICSDate(new Date())}`,`STATUS:${status}`,
    `DTSTART:${formatICSDate(startTime)}`,`DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${cancel ? '[취소됨] ' : ''}타임오프클럽 - ${spotInfo?.name || spot}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${spotInfo?.address || spot}`,`URL:${spotInfo?.mapUrl || ''}`,
    'BEGIN:VALARM','TRIGGER:-PT3H','ACTION:DISPLAY',`DESCRIPTION:${getAlarmMessage(3)}`,'END:VALARM',
    'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY',`DESCRIPTION:${getAlarmMessage(1)}`,'END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');

  return new NextResponse(icsContent, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="timeoffclub-${date}${cancel ? '-cancel' : ''}.ics"` },
  });
}

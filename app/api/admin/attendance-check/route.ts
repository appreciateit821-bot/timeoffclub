import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { SPOT_DETAILS } from '@/lib/constants';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  try {
    const { targetDate } = await request.json();
    
    const db = getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // 해당 날짜의 스몰토크 예약 현황 조회
    const reservations = await db.prepare(`
      SELECT 
        spot,
        COUNT(*) as count,
        GROUP_CONCAT(name) as members
      FROM reservations 
      WHERE date = ? AND mode = 'smalltalk'
      GROUP BY spot
    `).bind(targetDate).all();

    const riskySpots: any[] = [];
    const pushTargets: any[] = [];

    for (const res of reservations.results as any[]) {
      if (res.count === 1) {
        const spotInfo = SPOT_DETAILS.find(s => s.id === res.spot);
        riskySpots.push({
          spot: res.spot,
          spotName: spotInfo?.name || res.spot,
          member: res.members,
          count: res.count
        });

        // 해당 멤버의 푸시 구독 정보 조회
        const pushSub = await db.prepare(`
          SELECT ps.* 
          FROM push_subscriptions ps 
          JOIN members m ON ps.member_id = m.id 
          WHERE m.name = ? AND ps.active = 1
        `).bind(res.members).first() as any;

        if (pushSub) {
          pushTargets.push({
            member: res.members,
            spot: res.spot,
            spotName: spotInfo?.name || res.spot,
            subscription: pushSub
          });
        }
      }
    }

    // 푸시 알림 발송 (웹 푸시 API 호출)
    let pushedCount = 0;
    for (const target of pushTargets) {
      try {
        const pushResponse = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: target.subscription.endpoint,
              keys: {
                p256dh: target.subscription.p256dh,
                auth: target.subscription.auth
              }
            },
            payload: {
              title: '⚠️ 참석 확인 필요',
              body: `${target.spotName}에 혼자 예약되어 있습니다. 참석 가능하신지 확인해주세요!`,
              url: '/calendar',
              urgent: true
            }
          })
        });

        if (pushResponse.ok) {
          pushedCount++;
        }
      } catch (error) {
        console.error(`Push failed for ${target.member}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      targetDate,
      riskySpots,
      totalRiskySpots: riskySpots.length,
      pushSent: pushedCount,
      pushTargets: pushTargets.length,
      message: `${targetDate} 세션 확인: ${riskySpots.length}개 스팟에서 1명 예약 발견, ${pushedCount}명에게 알림 발송`
    });

  } catch (error) {
    console.error('Attendance check error:', error);
    return NextResponse.json({ 
      error: '참석 확인 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 자동 호출용 GET 엔드포인트 (크론잡에서 사용)
export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // 오늘과 내일의 세션 날짜들 확인
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    
    const dates = [today, tomorrow, dayAfterTomorrow].map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    let totalChecked = 0;
    let totalAlerts = 0;
    const results = [];

    for (const dateStr of dates) {
      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      // 수요일(3) 또는 일요일(0)만 체크
      if (dayOfWeek !== 3 && dayOfWeek !== 0) continue;

      // 각 날짜별로 체크
      const checkResponse = await fetch(`${request.url.split('/attendance-check')[0]}/attendance-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: dateStr })
      });

      if (checkResponse.ok) {
        const result = await checkResponse.json();
        totalChecked += result.totalRiskySpots || 0;
        totalAlerts += result.pushSent || 0;
        results.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      message: `자동 참석 확인 완료: ${totalChecked}개 위험 스팟, ${totalAlerts}명에게 알림`,
      results,
      totalChecked,
      totalAlerts
    });

  } catch (error) {
    console.error('Auto attendance check error:', error);
    return NextResponse.json({ 
      error: '자동 참석 확인 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
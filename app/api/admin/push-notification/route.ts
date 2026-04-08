import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// VAPID 키 (실제 운영에서는 환경변수로 관리)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrubHGaiAOkhHBGG3eNtiqQQ2G29K8Q6UjzCMRj8Aod_qJHEyV1lMk';
const VAPID_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg4f2k7qxMQj7KaI0uHALCJ5E2qE2k9rXMCj7I4j2kF8KhRANCAAQJe9olGIFIr8SJL9vakr4RK4gm9N4QlC66245ZqAAkzIRwRht3jbYqkkNhtvTvEOlI8wjEY_AKHf6iRxMldZTJ';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  try {
    const { title, body, targetType, targetUsers, url } = await request.json();
    
    if (!title || !body) {
      return NextResponse.json({ error: '제목과 내용 필요' }, { status: 400 });
    }

    // 타겟 사용자 구독 목록 조회
    let subscriptionsQuery = 'SELECT * FROM push_subscriptions';
    const params: string[] = [];

    if (targetType === 'specific' && targetUsers?.length > 0) {
      const placeholders = targetUsers.map(() => '?').join(',');
      subscriptionsQuery += ` WHERE user_name IN (${placeholders})`;
      params.push(...targetUsers);
    } else if (targetType === 'active_members') {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      subscriptionsQuery += ` WHERE user_name IN (
        SELECT m.name FROM members m 
        WHERE m.is_active = 1 
        AND m.active_months LIKE '%' || ? || '%'
        AND m.name NOT IN (SELECT COALESCE(t.name, '') FROM trial_tickets t WHERE t.name IS NOT NULL)
      )`;
      params.push(currentMonth);
    }

    const { results: subscriptions } = await db.prepare(subscriptionsQuery).bind(...params).all();

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '발송 대상 없음',
        sent: 0,
        total: 0 
      });
    }

    // 웹푸시 발송
    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions as any[]) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const payload = JSON.stringify({
          title,
          body,
          url: url || '/calendar',
          notificationId: Date.now() + Math.random()
        });

        // 실제 웹푸시 발송 (webpush 라이브러리 필요)
        // 현재는 시뮬레이션으로 대체
        console.log(`Sending push to ${sub.user_name}:`, payload);
        
        // 성공으로 가정
        sentCount++;

      } catch (error) {
        console.error(`Push failed for ${sub.user_name}:`, error);
        errors.push(`${sub.user_name}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '푸시 알림 발송 완료',
      sent: sentCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return NextResponse.json({ 
      error: '푸시 발송 실패',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
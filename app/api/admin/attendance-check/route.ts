import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { SPOT_DETAILS, getSessionStartTime, getDeadlineText, AVAILABLE_DAYS } from '@/lib/constants';
import { sendEmail, buildAttendanceCheckEmail } from '@/lib/email';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const NOTIFICATION_TYPE = 'attendance_check_3h';

type Channel = 'email' | 'push' | 'sms' | 'inapp';

type MemberInfo = {
  name: string;
  phone: string | null;
  email: string | null;
  pushSubscription: { endpoint: string; p256dh: string; auth: string } | null;
};

async function alreadySent(db: D1Database, date: string, spot: string, member: string, channel: Channel): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM notification_logs WHERE date = ? AND spot = ? AND member_name = ? AND notification_type = ? AND channel = ? LIMIT 1'
  ).bind(date, spot, member, NOTIFICATION_TYPE, channel).first();
  return !!row;
}

async function logSent(
  db: D1Database,
  date: string,
  spot: string,
  member: string,
  channel: Channel,
  success: boolean,
  errorMessage?: string
) {
  try {
    await db.prepare(
      `INSERT OR IGNORE INTO notification_logs (date, spot, member_name, notification_type, channel, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(date, spot, member, NOTIFICATION_TYPE, channel, success ? 1 : 0, errorMessage ?? null).run();
  } catch (e) {
    console.error('logSent failed:', e);
  }
}

async function getMemberInfo(db: D1Database, name: string): Promise<MemberInfo | null> {
  const row = await db.prepare(
    `SELECT m.name, m.phone, m.email, ps.endpoint, ps.p256dh, ps.auth
     FROM members m
     LEFT JOIN push_subscriptions ps ON ps.member_id = m.id AND ps.active = 1
     WHERE m.name = ?`
  ).bind(name).first() as any;
  if (!row) return null;
  return {
    name: row.name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    pushSubscription: row.endpoint ? { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth } : null,
  };
}

async function processAttendanceCheck(db: D1Database, targetDate: string, originUrl: string) {
  const reservations = await db.prepare(`
    SELECT spot, COUNT(*) as count, GROUP_CONCAT(user_name) as members
    FROM reservations
    WHERE date = ? AND mode = 'smalltalk'
    GROUP BY spot
  `).bind(targetDate).all();

  const riskySpots: Array<{ spot: string; spotName: string; count: number; members: string[] }> = [];
  const notificationResults: Array<{
    member: string;
    spot: string;
    channels: { channel: Channel; status: 'sent' | 'skipped' | 'failed'; error?: string }[];
  }> = [];

  let emailSent = 0;
  let pushSent = 0;
  let smsSent = 0;
  let inappSent = 0;

  const sessionStart = getSessionStartTime(targetDate);
  const sessionTimeStr = sessionStart.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const deadlineText = getDeadlineText(targetDate);

  for (const res of (reservations.results as any[]) ?? []) {
    if (res.count > 2) continue;
    const memberNames: string[] = String(res.members ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const spotInfo = SPOT_DETAILS.find(s => s.id === res.spot);
    const spotName = spotInfo?.name ?? res.spot;

    riskySpots.push({ spot: res.spot, spotName, count: res.count, members: memberNames });

    for (const memberName of memberNames) {
      const info = await getMemberInfo(db, memberName);
      if (!info) continue;

      const channelResults: { channel: Channel; status: 'sent' | 'skipped' | 'failed'; error?: string }[] = [];

      // 1. 이메일 (메인 채널)
      if (info.email) {
        if (await alreadySent(db, targetDate, res.spot, memberName, 'email')) {
          channelResults.push({ channel: 'email', status: 'skipped' });
        } else {
          const { subject, html } = buildAttendanceCheckEmail({
            memberName,
            spotName,
            sessionDate: targetDate,
            sessionTime: sessionTimeStr,
            currentCount: res.count,
            deadlineText,
          });
          const result = await sendEmail({ to: info.email, subject, html });
          await logSent(db, targetDate, res.spot, memberName, 'email', result.ok, result.ok ? undefined : result.error);
          if (result.ok) {
            emailSent++;
            channelResults.push({ channel: 'email', status: 'sent' });
          } else {
            channelResults.push({ channel: 'email', status: 'failed', error: result.error });
          }
        }
      }

      // 2. 웹 푸시
      if (info.pushSubscription) {
        if (await alreadySent(db, targetDate, res.spot, memberName, 'push')) {
          channelResults.push({ channel: 'push', status: 'skipped' });
        } else {
          try {
            const pushRes = await fetch(`${originUrl}/api/push/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: info.pushSubscription,
                payload: {
                  title: '⚠️ 참석 확인 필요',
                  body: `${spotName} 세션이 현재 ${res.count}명 — 참석 확인 부탁드려요.`,
                  url: '/calendar',
                  urgent: true,
                },
              }),
            });
            const ok = pushRes.ok;
            await logSent(db, targetDate, res.spot, memberName, 'push', ok, ok ? undefined : `HTTP ${pushRes.status}`);
            if (ok) {
              pushSent++;
              channelResults.push({ channel: 'push', status: 'sent' });
            } else {
              channelResults.push({ channel: 'push', status: 'failed', error: `HTTP ${pushRes.status}` });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await logSent(db, targetDate, res.spot, memberName, 'push', false, msg);
            channelResults.push({ channel: 'push', status: 'failed', error: msg });
          }
        }
      }

      // 3. SMS (전화번호 있을 때)
      if (info.phone && info.phone.length > 8) {
        if (await alreadySent(db, targetDate, res.spot, memberName, 'sms')) {
          channelResults.push({ channel: 'sms', status: 'skipped' });
        } else {
          const smsBody = `[타임오프클럽] ${memberName}님, ${spotName} 세션 현재 ${res.count}명 신청. 참석 확인 부탁드려요. 변경/취소: ${deadlineText} 마감. https://time-off-club.com/calendar`;
          try {
            const smsRes = await fetch(`${originUrl}/api/admin/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: memberName, title: '타임오프클럽 참석 확인', body: smsBody, method: 'sms' }),
            });
            const ok = smsRes.ok;
            await logSent(db, targetDate, res.spot, memberName, 'sms', ok, ok ? undefined : `HTTP ${smsRes.status}`);
            if (ok) {
              smsSent++;
              channelResults.push({ channel: 'sms', status: 'sent' });
            } else {
              channelResults.push({ channel: 'sms', status: 'failed', error: `HTTP ${smsRes.status}` });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await logSent(db, targetDate, res.spot, memberName, 'sms', false, msg);
            channelResults.push({ channel: 'sms', status: 'failed', error: msg });
          }
        }
      }

      // 4. 인앱 알림 (항상)
      if (await alreadySent(db, targetDate, res.spot, memberName, 'inapp')) {
        channelResults.push({ channel: 'inapp', status: 'skipped' });
      } else {
        try {
          await db.prepare(
            `INSERT INTO urgent_notifications (member_name, title, content, created_at, expires_at)
             VALUES (?, ?, ?, datetime('now'), datetime('now', '+4 hours'))`
          ).bind(
            memberName,
            '⚠️ 참석 확인 필요',
            `${spotName} 세션 현재 ${res.count}명 — 참석 확인 부탁드려요.`
          ).run();
          await logSent(db, targetDate, res.spot, memberName, 'inapp', true);
          inappSent++;
          channelResults.push({ channel: 'inapp', status: 'sent' });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await logSent(db, targetDate, res.spot, memberName, 'inapp', false, msg);
          channelResults.push({ channel: 'inapp', status: 'failed', error: msg });
        }
      }

      notificationResults.push({ member: memberName, spot: spotName, channels: channelResults });
    }
  }

  return {
    targetDate,
    riskySpots,
    totalRiskySpots: riskySpots.length,
    emailSent,
    pushSent,
    smsSent,
    inappSent,
    totalMembers: notificationResults.length,
    notificationResults,
  };
}

// 관리자 수동 트리거
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  try {
    const { targetDate } = await request.json();
    const db = getDB();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    if (!targetDate) return NextResponse.json({ error: 'targetDate required' }, { status: 400 });

    const originUrl = request.url.split('/api/')[0];
    const result = await processAttendanceCheck(db, targetDate, originUrl);

    return NextResponse.json({
      success: true,
      message: `${targetDate}: ${result.totalRiskySpots}개 스팟에서 ≤2명 신청, 이메일 ${result.emailSent} / 푸시 ${result.pushSent} / SMS ${result.smsSent} / 인앱 ${result.inappSent}건 발송`,
      ...result,
    });
  } catch (error) {
    console.error('Attendance check (POST) error:', error);
    return NextResponse.json({
      error: '참석 확인 오류',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// 자동 cron 트리거 (GitHub Actions 등 외부에서 호출)
export async function GET(request: NextRequest) {
  // CRON_SECRET 검증
  let expectedSecret: string | undefined;
  try {
    const { env } = getRequestContext();
    expectedSecret = (env as any).CRON_SECRET;
  } catch {
    expectedSecret = process.env.CRON_SECRET;
  }
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured on server' }, { status: 500 });
  }
  const provided = request.headers.get('X-Cron-Secret');
  if (provided !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDB();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const now = Date.now();
    const candidates: string[] = [];
    // 오늘과 내일을 후보로 (cron이 자정 직전에 도는 경우 대비)
    for (let i = 0; i < 2; i++) {
      const d = new Date(now + i * 24 * 60 * 60 * 1000);
      const kstNow = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const yyyy = kstNow.getUTCFullYear();
      const mm = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(kstNow.getUTCDate()).padStart(2, '0');
      candidates.push(`${yyyy}-${mm}-${dd}`);
    }

    const triggered: any[] = [];
    const skipped: { date: string; reason: string }[] = [];
    const originUrl = request.url.split('/api/')[0];

    for (const dateStr of candidates) {
      const dayOfWeek = new Date(dateStr + 'T00:00:00Z').getUTCDay();
      if (dayOfWeek !== AVAILABLE_DAYS.WEDNESDAY && dayOfWeek !== AVAILABLE_DAYS.SUNDAY) {
        skipped.push({ date: dateStr, reason: '세션 없는 요일' });
        continue;
      }

      const sessionStart = getSessionStartTime(dateStr).getTime();
      const hoursUntilStart = (sessionStart - now) / (1000 * 60 * 60);

      // T-3.5h ~ T-2h 윈도우에서만 발송 (cron 30분 간격이라 최소 30분 윈도우 필요)
      if (hoursUntilStart > 3.5 || hoursUntilStart <= 2) {
        skipped.push({ date: dateStr, reason: `T-3h 윈도우 밖 (남은 시간 ${hoursUntilStart.toFixed(2)}h)` });
        continue;
      }

      const result = await processAttendanceCheck(db, dateStr, originUrl);
      triggered.push(result);
    }

    return NextResponse.json({
      success: true,
      now: new Date(now).toISOString(),
      triggered,
      skipped,
      summary: triggered.length === 0
        ? '발송 대상 세션 없음'
        : `${triggered.length}개 세션 처리: 이메일 ${triggered.reduce((s, r) => s + r.emailSent, 0)} / 푸시 ${triggered.reduce((s, r) => s + r.pushSent, 0)} / SMS ${triggered.reduce((s, r) => s + r.smsSent, 0)} / 인앱 ${triggered.reduce((s, r) => s + r.inappSent, 0)}`,
    });
  } catch (error) {
    console.error('Auto attendance check error:', error);
    return NextResponse.json({
      error: '자동 참석 확인 오류',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

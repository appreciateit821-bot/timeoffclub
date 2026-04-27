import { getRequestContext } from '@cloudflare/next-on-pages';

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

type SendResult = { ok: true; id: string } | { ok: false; error: string };

function getEnv() {
  try {
    const { env } = getRequestContext();
    return {
      apiKey: (env as any).RESEND_API_KEY as string | undefined,
      from: (env as any).MAIL_FROM as string | undefined,
    };
  } catch {
    return {
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.MAIL_FROM,
    };
  }
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<SendResult> {
  const { apiKey, from } = getEnv();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };
  if (!from) return { ok: false, error: 'MAIL_FROM not configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        reply_to: replyTo ?? 'wellmomentseoul@gmail.com',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${text}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function buildAttendanceCheckEmail(args: {
  memberName: string;
  spotName: string;
  sessionDate: string;
  sessionTime: string;
  currentCount: number;
  deadlineText: string;
}): { subject: string; html: string } {
  const { memberName, spotName, sessionDate, sessionTime, currentCount, deadlineText } = args;
  const subject = `[타임오프클럽] ${spotName} 세션 참석 확인 부탁드려요`;
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">
    <h2 style="margin:0 0 16px;font-size:20px">참석 확인이 필요해요 🌿</h2>
    <p>안녕하세요 <strong>${memberName}</strong>님,</p>
    <p>오늘 <strong>${sessionDate} ${sessionTime}</strong> 진행 예정인
       <strong>${spotName}</strong> 세션에 현재 <strong>${currentCount}명</strong>이 신청해주셨어요.</p>
    <p>스몰토크 세션은 보통 2명 이상 모여야 자연스럽게 진행되어,
       마감 전까지 인원이 더 모이는지 살펴보고 있습니다.</p>
    <div style="background:#f5f1ea;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>예약 마감</strong>: ${deadlineText} (세션 시작 2시간 전)</p>
      <p style="margin:0">마감 전까지 예약 신청과 변경이 모두 가능합니다.</p>
    </div>
    <p>참석 가능하시면 <strong>그대로 두시면</strong> 됩니다.<br/>
       어려우시다면 마감 전에 예약을 취소해주세요.</p>
    <p style="margin:24px 0">
      <a href="https://time-off-club.com/calendar"
         style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">
        예약 확인하기
      </a>
    </p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0"/>
    <p style="font-size:12px;color:#888;margin:0">
      문의: <a href="mailto:wellmomentseoul@gmail.com" style="color:#888">wellmomentseoul@gmail.com</a><br/>
      타임오프클럽 · 폰에서 잠시 떨어지는 시간
    </p>
  </div>`;
  return { subject, html };
}

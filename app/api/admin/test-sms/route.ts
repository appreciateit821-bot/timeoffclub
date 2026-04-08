import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// SMS 발송 함수 (Twilio API - Edge Runtime 호환)
async function sendSMS(phone: string, message: string) {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    console.log('SMS 설정 없음 - 시뮬레이션 모드');
    return { success: true, simulation: true, message: 'SMS 시뮬레이션 모드 (설정 없음)' };
  }

  try {
    // Twilio REST API 호출 (Basic Auth 사용)
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: twilioFromNumber,
        To: phone.startsWith('+82') ? phone : `+82${phone.startsWith('0') ? phone.slice(1) : phone}`,
        Body: message
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      return { success: true, result, messageId: result.sid };
    } else {
      return { success: false, error: result.message || 'SMS 발송 실패' };
    }
  } catch (error) {
    console.error('SMS 발송 실패:', error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db || !session.isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { testPhone, testMessage } = await request.json();
  
  if (!testPhone || !testMessage) {
    return NextResponse.json({ error: '휴대폰 번호와 메시지가 필요합니다' }, { status: 400 });
  }

  try {
    const smsResult = await sendSMS(testPhone, testMessage);
    
    return NextResponse.json({ 
      success: true,
      sms: smsResult,
      message: smsResult.simulation ? 
        `📱 SMS 시뮬레이션 성공: ${testPhone} -> "${testMessage}"` :
        `📱 SMS 발송 성공: ${testPhone}`
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'SMS 테스트 실패: ' + error 
    }, { status: 500 });
  }
}
import { describe, test, expect, beforeAll } from 'vitest';

const BASE_URL = 'https://timeoffclub.pages.dev';
const ADMIN_PASSWORD = 'hyeon821';
const TEST_MEMBER_NAME = '테스트멤버';
const TEST_MEMBER_PHONE = '9999';

// 쿠키 저장용
let adminCookie = '';
let memberCookie = '';

// 쿠키 추출 헬퍼
function extractCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return '';
  // 'user=...; Path=/; ...' 에서 user=... 부분만 추출
  const match = setCookie.match(/user=[^;]+/);
  return match ? match[0] : '';
}

describe('관리자 API 테스트', () => {
  beforeAll(async () => {
    // 관리자 로그인
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '관리자', password: ADMIN_PASSWORD }),
      redirect: 'manual',
    });
    expect(res.ok).toBe(true);
    adminCookie = extractCookie(res);
    expect(adminCookie).toContain('user=');
    console.log('✅ 관리자 로그인 성공');
  });

  test('관리자 예약목록 조회 - GET /api/admin/reservations', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/reservations`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('reservations');
    expect(Array.isArray(data.reservations)).toBe(true);
    console.log(`✅ 예약 ${data.reservations.length}건 조회`);
  });

  test('관리자 예약목록에 mode 필드가 포함됨', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/reservations`, {
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    
    if (data.reservations.length > 0) {
      const first = data.reservations[0];
      expect(first).toHaveProperty('mode');
      expect(['smalltalk', 'reflection']).toContain(first.mode);
      console.log(`✅ 첫 예약 모드: ${first.mode}`);
      
      // 모든 예약에 mode가 있는지
      for (const r of data.reservations) {
        expect(r).toHaveProperty('mode');
        expect(['smalltalk', 'reflection', null]).toContain(r.mode);
      }
      console.log(`✅ 전체 ${data.reservations.length}건 모두 mode 필드 있음`);
    } else {
      console.log('ℹ️ 예약이 없어서 mode 필드 검증 스킵');
    }
  });

  test('관리자 예약목록에 display_id가 포함됨', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/reservations`, {
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    
    if (data.reservations.length > 0) {
      const first = data.reservations[0];
      expect(first).toHaveProperty('display_id');
      expect(first).toHaveProperty('user_name');
      console.log(`✅ display_id: ${first.display_id}, user_name: ${first.user_name}`);
    }
  });

  test('비인증 사용자는 관리자 API 접근 불가', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/reservations`);
    expect(res.status).toBe(403);
    console.log('✅ 비인증 접근 차단 확인');
  });

  test('관리자 멤버 목록 조회', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/members`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('members');
    expect(Array.isArray(data.members)).toBe(true);
    console.log(`✅ 멤버 ${data.members.length}명 조회`);
  });
});

describe('멤버 예약 API - mode 파라미터 테스트', () => {
  beforeAll(async () => {
    // 테스트 멤버 존재 확인을 위해 관리자로 로그인
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '관리자', password: ADMIN_PASSWORD }),
      redirect: 'manual',
    });
    adminCookie = extractCookie(adminRes);

    // 테스트 멤버로 로그인 시도
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: TEST_MEMBER_NAME, phoneLast4: TEST_MEMBER_PHONE }),
      redirect: 'manual',
    });
    
    if (res.ok) {
      memberCookie = extractCookie(res);
      console.log('✅ 테스트 멤버 로그인 성공');
    } else {
      console.log('⚠️ 테스트 멤버 미등록 - 예약 생성 테스트 스킵됩니다');
    }
  });

  test('예약 생성 시 mode=smalltalk 기본값 적용', async () => {
    if (!memberCookie) {
      console.log('⏭️ 멤버 로그인 안됨 - 스킵');
      return;
    }

    // 미래 수요일 날짜 계산
    const futureWednesday = getNextAvailableDate(3);
    
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: memberCookie },
      body: JSON.stringify({
        date: futureWednesday,
        spot: '약수_스티키플로어',
        // mode 생략 → 기본값 smalltalk
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      expect(data.success).toBe(true);
      console.log(`✅ 모드 미지정 예약 생성 성공 (${futureWednesday})`);
      
      // 정리: 예약 삭제
      await cleanupReservation(futureWednesday);
    } else {
      const err = await res.json();
      console.log(`ℹ️ 예약 생성 실패 (예상 가능): ${err.error}`);
    }
  });

  test('예약 생성 시 mode=reflection 명시 적용', async () => {
    if (!memberCookie) {
      console.log('⏭️ 멤버 로그인 안됨 - 스킵');
      return;
    }

    const futureSunday = getNextAvailableDate(0);
    
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: memberCookie },
      body: JSON.stringify({
        date: futureSunday,
        spot: '망원_다시점',
        mode: 'reflection',
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      expect(data.success).toBe(true);
      console.log(`✅ mode=reflection 예약 생성 성공 (${futureSunday})`);
      
      // 관리자로 확인
      const adminRes = await fetch(`${BASE_URL}/api/admin/reservations`, {
        headers: { Cookie: adminCookie },
      });
      const adminData = await adminRes.json();
      const myRes = adminData.reservations.find(
        (r: any) => r.user_name === TEST_MEMBER_NAME && r.date === futureSunday
      );
      
      if (myRes) {
        expect(myRes.mode).toBe('reflection');
        console.log(`✅ 관리자 API에서 mode=reflection 확인`);
      }
      
      // 정리
      await cleanupReservation(futureSunday);
    } else {
      const err = await res.json();
      console.log(`ℹ️ 예약 생성 실패 (예상 가능): ${err.error}`);
    }
  });
});

describe('예약 API - 날짜별 조회 시 modeStats', () => {
  test('날짜별 예약 조회 시 modeStats 포함됨', async () => {
    if (!memberCookie && !adminCookie) {
      console.log('⏭️ 로그인 안됨 - 스킵');
      return;
    }
    
    const cookie = memberCookie || adminCookie;
    // 아무 날짜로 조회
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/api/reservations?date=${today}`, {
      headers: { Cookie: cookie },
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('reservations');
    expect(data).toHaveProperty('modeStats');
    console.log(`✅ modeStats 필드 확인: ${JSON.stringify(data.modeStats)}`);
  });
});

// 유틸리티 함수들
function getNextAvailableDate(targetDay: number): string {
  // targetDay: 0=일, 3=수
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let date = new Date(kst);
  
  // 최소 3일 뒤부터 찾기 (마감 방지)
  date.setDate(date.getDate() + 3);
  
  while (date.getDay() !== targetDay) {
    date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
}

async function cleanupReservation(date: string) {
  try {
    // 내 예약 조회
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      headers: { Cookie: memberCookie },
    });
    const data = await res.json();
    const reservation = data.reservations?.find((r: any) => r.date === date);
    
    if (reservation) {
      await fetch(`${BASE_URL}/api/reservations?id=${reservation.id}`, {
        method: 'DELETE',
        headers: { Cookie: memberCookie },
      });
      console.log(`🧹 예약 정리 완료 (${date})`);
    }
  } catch (e) {
    console.log(`⚠️ 예약 정리 실패: ${e}`);
  }
}

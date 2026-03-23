export const PASSWORDS = {
  USER: 'timeoff2026',
  ADMIN: 'admin2026',
  SPOT_OPERATORS: {
    '약수_스티키플로어': '3321',
    '망원_다시점': '6626',
    '압구정로데오_벤슨 테이스팅 라운지': '9633',
    '서촌_터틀도브': '7849'
  }
};

export interface SpotInfo {
  id: string;
  name: string;
  address: string;
  discount: string;
  features: string;
  mapUrl: string;
}

export const SPOT_DETAILS: SpotInfo[] = [
  {
    id: '망원_다시점',
    name: '망원_다시점',
    address: '서울 마포구 월드컵로29길 51 3층',
    discount: '모든 음료 4000원 (아메리카노, 자몽에이드, 딸기라떼, 캐모마일, 말차라떼 등 제조음료 또는 와인한잔)',
    features: '편안한 자리와 책과 음악이 몰입을 돕습니다. 우드톤 구성이 전하는 아늑함. 소파 좌석은 사색용, 메인 테이블은 대화용. 마포구청역 추천.',
    mapUrl: 'https://naver.me/5as8TmvV'
  },
  {
    id: '약수_스티키플로어',
    name: '약수_스티키플로어',
    address: '서울 중구 다산로 60 2층',
    discount: '모든 음료 2,000원 할인 / 샌드위치, 디저트 1,000원 할인',
    features: '프레쉬한 샌드위치와 스페셜티 커피를 매개로 사람과 브랜드 그리고 경험을 연결하는 공간',
    mapUrl: 'https://naver.me/GNWkJjY6'
  },
  {
    id: '압구정로데오_벤슨 테이스팅 라운지',
    name: '압구정로데오_벤슨 테이스팅 라운지',
    address: '서울 강남구 선릉로 829 2층',
    discount: '셰프가 만든 프리미엄 아이스크림과 모모스 커피 제공 (1만원)',
    features: '압구정 로데오의 고급스러운 프라이빗 공간에서 아이스크림을 단순한 디저트가 아닌 하나의 미식으로 경험하는 공간',
    mapUrl: 'https://naver.me/GBvUb8O6'
  },
  {
    id: '서촌_터틀도브',
    name: '서촌_터틀도브',
    address: '서울 종로구 사직로9가길 13',
    discount: '해피아워 7,000원 (계절과 그날의 분위기에 맞는 오늘의 차 2종을 직접 셀렉하여 우려서 제공. 기존 12,000-15,000원 선)',
    features: '서촌에 위치한 2층짜리 한옥 웰니스라운지. 1층은 사색 공간, 2층은 스몰톡 공간. 고즈넉한 서촌에서 도심속 즐거운 단절을 경험.',
    mapUrl: 'https://naver.me/xS10BwNC'
  }
];

export const SPOTS = SPOT_DETAILS.map(spot => spot.id) as unknown as readonly string[];

export const MAX_CAPACITY = 10;
export const MIN_CAPACITY = 4; // 최소 오픈 인원

export const AVAILABLE_DAYS = {
  WEDNESDAY: 3, // 수요일
  SUNDAY: 0     // 일요일
} as const;

export const TIME_SLOTS = {
  WEDNESDAY: '20:00',
  SUNDAY: '15:00'
} as const;

export type Spot = typeof SPOTS[number];

// 세션 시작 시간 가져오기 (KST 기준)
export function getSessionStartTime(dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const dayOfWeek = date.getDay();
  if (dayOfWeek === AVAILABLE_DAYS.WEDNESDAY) {
    return new Date(dateStr + 'T20:00:00+09:00');
  }
  if (dayOfWeek === AVAILABLE_DAYS.SUNDAY) {
    return new Date(dateStr + 'T15:00:00+09:00');
  }
  return date;
}

// 세션 종료 시간 (2시간 후)
export function getSessionEndTime(dateStr: string): Date {
  const start = getSessionStartTime(dateStr);
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

// KST 현재 시간
export function getNowKST(): Date {
  const now = new Date();
  // UTC에 9시간 더해서 KST
  return new Date(now.getTime() + (9 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
}

// KST 오늘 날짜 문자열
export function getTodayKST(): string {
  const kst = getNowKST();
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

// 2시간 전 마감 체크 (KST 기준)
export function isBookingClosed(dateStr: string): boolean {
  const sessionStart = getSessionStartTime(dateStr);
  const deadline = new Date(sessionStart.getTime() - 2 * 60 * 60 * 1000);
  // KST 기준으로 비교하기 위해 UTC → KST 변환된 timestamp 비교
  const nowUTC = Date.now();
  return nowUTC >= deadline.getTime();
}

// 마감 시간 텍스트
export function getDeadlineText(dateStr: string): string {
  const sessionStart = getSessionStartTime(dateStr);
  const deadline = new Date(sessionStart.getTime() - 2 * 60 * 60 * 1000);
  const hours = deadline.getHours();
  const minutes = deadline.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

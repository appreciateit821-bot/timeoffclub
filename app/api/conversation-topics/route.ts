import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { SPOTS, SPOT_DETAILS } from '@/lib/constants';

export const runtime = 'edge';

// 대화 열기 조건 체크: 다른 스팟 4명 이상 & 해당 스팟 0명
async function checkEligibleSpots(db: any, date: string): Promise<string[]> {
  const eligibleSpots: string[] = [];
  
  // 모든 스팟의 예약 현황 조회
  const spotCounts: { [spot: string]: number } = {};
  for (const spot of SPOTS) {
    const countResult = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
    spotCounts[spot] = countResult?.count || 0;
  }
  
  // 4명 이상인 스팟이 있는지 확인
  const hasFullSpot = Object.values(spotCounts).some(count => count >= 4);
  
  if (hasFullSpot) {
    // 0명인 스팟들을 eligible로 추가
    for (const spot of SPOTS) {
      if (spotCounts[spot] === 0) {
        eligibleSpots.push(spot);
      }
    }
  }
  
  return eligibleSpots;
}

export async function GET(request: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) return NextResponse.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 });

    // 해당 날짜의 모든 대화 주제 조회
    const { results: topics } = await db.prepare('SELECT * FROM conversation_topics WHERE date = ? ORDER BY created_at ASC').bind(date).all();
    
    // 대화 열기 조건을 충족하는 스팟 목록
    const eligibleSpots = await checkEligibleSpots(db, date);
    
    return NextResponse.json({
      topics: topics || [],
      eligible_spots: eligibleSpots
    });
  } catch (error) {
    console.error('Get conversation topics error:', error);
    return NextResponse.json({ error: '대화 주제 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  try {
    const { date, spot, topic, category } = await request.json();
    
    // 필수 값 체크
    if (!date || !spot || !topic) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
    }
    
    // 주제 길이 체크 (30자 이내)
    if (topic.length > 30) {
      return NextResponse.json({ error: '주제는 30자 이내로 입력해주세요.' }, { status: 400 });
    }
    
    // 스팟 유효성 체크
    if (!SPOTS.includes(spot)) {
      return NextResponse.json({ error: '유효하지 않은 스팟입니다.' }, { status: 400 });
    }
    
    // 1. 해당 날짜+스팟에 이미 주제가 있는지 확인
    const existingTopic = await db.prepare('SELECT id FROM conversation_topics WHERE date = ? AND spot = ?').bind(date, spot).first();
    if (existingTopic) {
      return NextResponse.json({ error: '이미 대화 주제가 설정된 스팟입니다.' }, { status: 400 });
    }
    
    // 2. 해당 날짜+스팟에 예약이 0명인지 확인  
    const reservationCount = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ?').bind(date, spot).first() as any;
    if ((reservationCount?.count || 0) > 0) {
      return NextResponse.json({ error: '이미 예약이 있는 스팟에는 대화 주제를 설정할 수 없습니다.' }, { status: 400 });
    }
    
    // 3. 대화 열기 조건 체크 (다른 스팟 중 4명 이상인 곳이 있는지)
    const eligibleSpots = await checkEligibleSpots(db, date);
    if (!eligibleSpots.includes(spot)) {
      return NextResponse.json({ error: '현재 대화 열기 조건을 충족하지 않습니다.' }, { status: 400 });
    }
    
    // 4. 대화 주제 생성
    const result = await db.prepare(`
      INSERT INTO conversation_topics (date, spot, topic, category, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(date, spot, topic, category || null, user.name).run();
    
    const newTopic = {
      id: result.meta.last_row_id,
      date,
      spot,
      topic,
      category: category || null,
      created_by: user.name,
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      topic: newTopic
    });
  } catch (error) {
    console.error('Create conversation topic error:', error);
    return NextResponse.json({ error: '대화 주제 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
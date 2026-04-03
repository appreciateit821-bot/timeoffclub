import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const user = await getSession();
  if (!user || !db) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  // 관리자만 실행 가능
  if (user.name !== 'hyeon821' && user.name !== '슈퍼관리자') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 });
    }

    // 해당 날짜의 모든 대화 주제 조회
    const { results: topics } = await db.prepare('SELECT * FROM conversation_topics WHERE date = ?').bind(date).all();
    
    const orphanedTopics = [];
    let cleanedCount = 0;

    for (const topic of topics as any[]) {
      // 해당 스팟에 스몰토크 예약자가 있는지 확인
      const smalltalkCount = await db.prepare('SELECT COUNT(*) as count FROM reservations WHERE date = ? AND spot = ? AND mode != ?').bind(date, topic.spot, 'reflection').first() as any;
      
      if ((smalltalkCount?.count || 0) === 0) {
        // 스몰토크 예약자가 0명이면 고아 주제로 간주하고 삭제
        await db.prepare('DELETE FROM conversation_topics WHERE id = ?').bind(topic.id).run();
        orphanedTopics.push({
          spot: topic.spot,
          topic: topic.topic,
          created_by: topic.created_by
        });
        cleanedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      date,
      cleaned_count: cleanedCount,
      orphaned_topics: orphanedTopics
    });
  } catch (error) {
    console.error('Cleanup conversation topics error:', error);
    return NextResponse.json({ error: '대화 주제 정리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

// 긴급 알림 조회
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  }

  try {
    const db = getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // 현재 사용자의 읽지 않은 긴급 알림 조회 (만료되지 않은 것만)
    const notifications = await db.prepare(`
      SELECT id, title, content, created_at, expires_at
      FROM urgent_notifications 
      WHERE member_name = ? 
      AND is_read = 0 
      AND datetime('now') < expires_at
      ORDER BY created_at DESC
    `).bind(session.name).all();

    return NextResponse.json({
      success: true,
      notifications: notifications.results || []
    });

  } catch (error) {
    console.error('Urgent notifications fetch error:', error);
    return NextResponse.json({ 
      error: '긴급 알림 조회 실패',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 긴급 알림 읽음 처리
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  }

  try {
    const { notificationIds } = await request.json();
    
    const db = getDB();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // 특정 알림들을 읽음 처리
    if (notificationIds && Array.isArray(notificationIds)) {
      for (const id of notificationIds) {
        await db.prepare(`
          UPDATE urgent_notifications 
          SET is_read = 1 
          WHERE id = ? AND member_name = ?
        `).bind(id, session.name).run();
      }
    } else {
      // 모든 알림을 읽음 처리
      await db.prepare(`
        UPDATE urgent_notifications 
        SET is_read = 1 
        WHERE member_name = ? AND is_read = 0
      `).bind(session.name).run();
    }

    return NextResponse.json({
      success: true,
      message: '알림이 읽음 처리되었습니다'
    });

  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json({ 
      error: '알림 읽음 처리 실패',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
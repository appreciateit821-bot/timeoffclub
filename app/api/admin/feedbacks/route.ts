import { NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  await initDB();
  const db = getDB();
  const session = await getSession();
  if (!session?.isAdmin || !db) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { results: feedbacks } = await db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 500').all();
  const { results: issues } = await db.prepare("SELECT * FROM feedbacks WHERE person_issue IS NOT NULL AND person_issue != '' ORDER BY created_at DESC").all();
  return NextResponse.json({ feedbacks, issues });
}

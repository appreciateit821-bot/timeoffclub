import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { subscription } = await request.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: '구독 정보 필요' }, { status: 400 });

  await db.prepare(
    'INSERT INTO push_subscriptions (user_name, endpoint, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_name = ?, p256dh = ?, auth = ?'
  ).bind(
    session.name, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth,
    session.name, subscription.keys.p256dh, subscription.keys.auth
  ).run();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDB();
  const session = await getSession();
  if (!session || !db) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  const { endpoint } = await request.json();
  if (endpoint) {
    await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
  }
  return NextResponse.json({ success: true });
}

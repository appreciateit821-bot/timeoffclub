import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  return NextResponse.json({ user: session });
}

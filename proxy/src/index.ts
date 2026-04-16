import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import bcrypt from 'bcryptjs';

const PROXY_SECRET = process.env.PROXY_SECRET ?? '';
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? '';
const NAVER_API_BASE = 'https://api.commerce.naver.com';

if (!PROXY_SECRET || !NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('Missing env vars: PROXY_SECRET, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET');
  process.exit(1);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getNaverToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const timestamp = Date.now();
  const password = `${NAVER_CLIENT_ID}_${timestamp}`;
  const hashed = await bcrypt.hash(password, NAVER_CLIENT_SECRET);
  const signature = Buffer.from(hashed, 'utf-8').toString('base64');

  const body = new URLSearchParams({
    client_id: NAVER_CLIENT_ID,
    timestamp: String(timestamp),
    client_secret_sign: signature,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const res = await fetch(`${NAVER_API_BASE}/external/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Naver token error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// 아웃바운드 IP 확인 (네이버가 우리를 볼 때의 IP)
app.get('/outbound-ip', async (c) => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = (await res.json()) as { ip: string };
    return c.json({ outbound_ip: data.ip });
  } catch (e: any) {
    return c.json({ error: e?.message ?? String(e) }, 500);
  }
});

// 디버그: 환경변수 포맷 확인 (값 전체가 아닌 앞뒤 일부만 마스킹 후 노출)
app.get('/debug/env', (c) => {
  const sec = NAVER_CLIENT_SECRET;
  const id = NAVER_CLIENT_ID;
  return c.json({
    secret_length: sec.length,
    secret_starts: sec.slice(0, 4),
    secret_ends: sec.slice(-4),
    secret_contains_dollar: sec.includes('$'),
    id_length: id.length,
    id_preview: id.slice(0, 4) + '...',
  });
});

// 네이버 OAuth 토큰 발급 테스트 (IP 화이트리스트 검증용)
app.get('/naver-auth-test', async (c) => {
  try {
    const token = await getNaverToken();
    return c.json({ ok: true, token_preview: token.substring(0, 12) + '...', token_length: token.length });
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});

app.use('/naver/*', async (c, next) => {
  const auth = c.req.header('X-Proxy-Secret');
  if (auth !== PROXY_SECRET) return c.json({ error: 'forbidden' }, 403);
  return next();
});

// 네이버 커머스 API 일반 프록시 — GET /naver/* 또는 POST /naver/* 를 /external/v1/* 로 릴레이
app.all('/naver/*', async (c) => {
  try {
    const url = new URL(c.req.url);
    const naverPath = url.pathname.replace(/^\/naver/, '/external/v1');
    const target = `${NAVER_API_BASE}${naverPath}${url.search}`;

    const token = await getNaverToken();
    const init: RequestInit = {
      method: c.req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      init.body = await c.req.text();
    }

    const res = await fetch(target, init);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e: any) {
    console.error('proxy error:', e);
    return c.json({ error: 'proxy_error', message: e?.message ?? String(e) }, 500);
  }
});

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
console.log(`timeoff-naver-proxy listening on :${port}`);

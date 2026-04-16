import { getRequestContext } from '@cloudflare/next-on-pages';

export type NaverOrderBuyer = {
  name: string;
  phone?: string;
  phoneLast4?: string;
};

export type NaverVerifyResult =
  | { ok: true; buyer: NaverOrderBuyer; raw?: any }
  | { ok: false; error: string; status?: number };

function getEnv() {
  try {
    const { env } = getRequestContext();
    const url = (env as any).NAVER_PROXY_URL as string | undefined;
    const secret = (env as any).NAVER_PROXY_SECRET as string | undefined;
    return { url, secret };
  } catch {
    return { url: undefined, secret: undefined };
  }
}

function last4(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

// 네이버 주문번호(productOrderId)로 주문 조회 → 구매자 정보 반환
export async function fetchNaverOrder(orderId: string): Promise<NaverVerifyResult> {
  const { url, secret } = getEnv();
  if (!url || !secret) return { ok: false, error: 'proxy_env_missing' };

  try {
    const res = await fetch(`${url}/naver/pay-order/seller/product-orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { 'X-Proxy-Secret': secret },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `naver_api_${res.status}`, status: res.status };
    }

    const data = (await res.json()) as any;
    // 네이버 응답 구조에서 구매자 정보 추출
    // 실제 필드명은 네이버 응답에 따라 조정 필요 — 먼저 가능성 높은 경로 시도
    const order = data?.data ?? data;
    const buyerName: string =
      order?.productOrder?.ordererName ??
      order?.order?.ordererName ??
      order?.ordererName ??
      '';
    const buyerPhone: string =
      order?.productOrder?.ordererTel ??
      order?.order?.ordererTel ??
      order?.ordererTel ??
      '';

    return {
      ok: true,
      buyer: {
        name: buyerName,
        phone: buyerPhone,
        phoneLast4: buyerPhone ? last4(buyerPhone) : undefined,
      },
      raw: data,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'fetch_failed' };
  }
}

// 주문번호 + 입력 이름/뒷4자리 일치 검증
export async function verifyNaverOrder(orderId: string, name: string, phoneLast4: string) {
  const result = await fetchNaverOrder(orderId);
  if (!result.ok) return result;

  const nameMatch = result.buyer.name?.trim() === name.trim();
  const phoneMatch = result.buyer.phoneLast4 === phoneLast4;

  return {
    ok: true as const,
    buyer: result.buyer,
    nameMatch,
    phoneMatch,
    matched: nameMatch && phoneMatch,
    raw: result.raw,
  };
}

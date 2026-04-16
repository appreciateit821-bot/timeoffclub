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

async function proxyFetch(path: string): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  const { url, secret } = getEnv();
  if (!url || !secret) return { ok: false, status: 0, error: 'proxy_env_missing' };
  try {
    const res = await fetch(`${url}${path}`, {
      method: 'GET',
      headers: { 'X-Proxy-Secret': secret },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `naver_api_${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message ?? 'fetch_failed' };
  }
}

function extractBuyer(productOrderData: any): NaverOrderBuyer {
  const order = productOrderData?.data ?? productOrderData;
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
    name: buyerName,
    phone: buyerPhone,
    phoneLast4: buyerPhone ? last4(buyerPhone) : undefined,
  };
}

// 주문번호(orderId) 또는 상품주문번호(productOrderId)로 주문 조회 → 구매자 정보 반환
export async function fetchNaverOrder(orderIdOrProductOrderId: string): Promise<NaverVerifyResult> {
  const input = orderIdOrProductOrderId.trim();

  // 1) productOrderId로 바로 조회
  const directRes = await proxyFetch(`/naver/pay-order/seller/product-orders/${encodeURIComponent(input)}`);
  if (directRes.ok) {
    return { ok: true, buyer: extractBuyer(directRes.data), raw: directRes.data };
  }

  // 2) 404면 orderId로 간주하고 product-order-ids 조회 후 첫 번째 상품 주문 사용
  if (directRes.status === 404) {
    const resolveRes = await proxyFetch(`/naver/pay-order/seller/orders/${encodeURIComponent(input)}/product-order-ids`);
    if (!resolveRes.ok) {
      return { ok: false, error: `orderId resolve failed: ${resolveRes.error}`, status: resolveRes.status };
    }
    const ids: string[] =
      resolveRes.data?.data?.productOrderIds ??
      resolveRes.data?.productOrderIds ??
      [];
    if (!ids.length) {
      return { ok: false, error: 'no_product_orders_found' };
    }
    const poRes = await proxyFetch(`/naver/pay-order/seller/product-orders/${encodeURIComponent(ids[0])}`);
    if (!poRes.ok) {
      return { ok: false, error: `product-order fetch failed: ${poRes.error}`, status: poRes.status };
    }
    return { ok: true, buyer: extractBuyer(poRes.data), raw: poRes.data };
  }

  return { ok: false, error: directRes.error, status: directRes.status };
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

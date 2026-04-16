import { getRequestContext } from '@cloudflare/next-on-pages';

export type NaverOrderBuyer = {
  name: string;
  phone?: string;
  phoneLast4?: string;
  productId?: string;
  productName?: string;
};

export type NaverVerifyResult =
  | { ok: true; buyer: NaverOrderBuyer; raw?: any }
  | { ok: false; error: string; status?: number };

function getEnv() {
  try {
    const { env } = getRequestContext();
    const url = (env as any).NAVER_PROXY_URL as string | undefined;
    const secret = (env as any).NAVER_PROXY_SECRET as string | undefined;
    const productIds = ((env as any).NAVER_MEMBERSHIP_PRODUCT_IDS as string | undefined) ?? '';
    return { url, secret, productIds };
  } catch {
    return { url: undefined, secret: undefined, productIds: '' };
  }
}

function getMembershipProductIds(): string[] {
  const { productIds } = getEnv();
  return productIds.split(',').map(s => s.trim()).filter(Boolean);
}

function last4(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

async function proxyRequest(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  const { url, secret } = getEnv();
  if (!url || !secret) return { ok: false, status: 0, error: 'proxy_env_missing' };
  try {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: { 'X-Proxy-Secret': secret, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
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

function extractBuyer(entry: any): NaverOrderBuyer {
  const order = entry?.order ?? {};
  const productOrder = entry?.productOrder ?? {};
  const buyerName: string = order.ordererName ?? productOrder.ordererName ?? '';
  const buyerPhone: string = order.ordererTel ?? productOrder.ordererTel ?? '';
  const productId: string | undefined = productOrder.productId ?? productOrder.originProductNo ?? undefined;
  const productName: string | undefined = productOrder.productName ?? undefined;
  return {
    name: buyerName,
    phone: buyerPhone,
    phoneLast4: buyerPhone ? last4(buyerPhone) : undefined,
    productId: productId ? String(productId) : undefined,
    productName,
  };
}

// 주문번호(orderId) → productOrderIds 해석 → POST query로 주문 상세 조회
export async function fetchNaverOrder(orderIdOrProductOrderId: string): Promise<NaverVerifyResult> {
  const input = orderIdOrProductOrderId.trim();

  // 1) orderId로 간주 → productOrderIds 해석
  const resolveRes = await proxyRequest(
    `/naver/pay-order/seller/orders/${encodeURIComponent(input)}/product-order-ids`,
    { method: 'GET' },
  );

  let productOrderIds: string[] = [];
  if (resolveRes.ok) {
    productOrderIds = Array.isArray(resolveRes.data?.data) ? resolveRes.data.data : [];
  }
  // 해석 실패(404 등) → 입력값 자체가 productOrderId일 가능성으로 간주
  if (!productOrderIds.length) {
    productOrderIds = [input];
  }

  // 2) POST query로 주문 상세 조회
  const queryRes = await proxyRequest(`/naver/pay-order/seller/product-orders/query`, {
    method: 'POST',
    body: JSON.stringify({ productOrderIds }),
  });
  if (!queryRes.ok) {
    return { ok: false, error: `product-orders/query failed: ${queryRes.error}`, status: queryRes.status };
  }

  const entries: any[] = Array.isArray(queryRes.data?.data) ? queryRes.data.data : [];
  if (!entries.length) {
    return { ok: false, error: 'no_product_order_entries' };
  }

  return { ok: true, buyer: extractBuyer(entries[0]), raw: queryRes.data };
}

// 주문번호 + 입력 이름/뒷4자리 일치 검증 + 멤버십 상품 여부 검증
export async function verifyNaverOrder(orderId: string, name: string, phoneLast4: string) {
  const result = await fetchNaverOrder(orderId);
  if (!result.ok) return result;

  const membershipIds = getMembershipProductIds();
  const nameMatch = result.buyer.name?.trim() === name.trim();
  const phoneMatch = result.buyer.phoneLast4 === phoneLast4;
  const productMatch =
    membershipIds.length === 0
      ? true
      : !!result.buyer.productId && membershipIds.includes(result.buyer.productId);

  return {
    ok: true as const,
    buyer: result.buyer,
    nameMatch,
    phoneMatch,
    productMatch,
    matched: nameMatch && phoneMatch && productMatch,
    raw: result.raw,
  };
}

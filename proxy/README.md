# timeoff-naver-proxy

네이버 커머스 API 호출용 프록시 (Fly.io 전용, 고정 IPv4).

## 로컬 실행

```bash
cd proxy
npm install
PROXY_SECRET=devsecret \
NAVER_CLIENT_ID=... \
NAVER_CLIENT_SECRET=... \
npm run dev
```

헬스체크: `curl http://localhost:8080/health`

## Fly.io 배포 (최초)

```bash
cd proxy

# 1. 앱 생성 (이름이 선점되어 있으면 다른 이름 사용)
fly launch --no-deploy --name timeoff-naver-proxy --region nrt

# 2. 시크릿 주입
fly secrets set \
  PROXY_SECRET="<랜덤 32자 이상>" \
  NAVER_CLIENT_ID="<네이버 커머스 애플리케이션 ID>" \
  NAVER_CLIENT_SECRET="<네이버 커머스 시크릿>"

# 3. 배포
fly deploy

# 4. 전용 고정 IPv4 할당 ($2/월)
fly ips allocate-v4

# 5. 할당된 IP 확인
fly ips list
```

`fly ips list` 결과의 `v4` 값을 **네이버 커머스 API 센터 > 애플리케이션 > API 호출 IP**에 업데이트.

## 동작 확인

```bash
curl https://timeoff-naver-proxy.fly.dev/health
# → {"ok":true,"ts":...}

curl -X GET https://timeoff-naver-proxy.fly.dev/naver/pay-order/seller/product-orders/XXX \
  -H "X-Proxy-Secret: <PROXY_SECRET>"
```

## 엔드포인트

- `GET /health` — 인증 불필요, 상태 확인용
- `* /naver/*` — `X-Proxy-Secret` 필수. 내부적으로 `/external/v1/*` 로 릴레이.
  - 예: 프록시에 `/naver/pay-order/seller/product-orders/{id}` → 네이버에 `/external/v1/pay-order/seller/product-orders/{id}`

## 아키텍처

```
Cloudflare Worker
  └─ fetch(https://timeoff-naver-proxy.fly.dev/naver/...)
      헤더: X-Proxy-Secret
        └─ Fly.io VM (고정 IPv4)
            └─ bcrypt 서명 + OAuth2 토큰 발급 (캐시)
                └─ https://api.commerce.naver.com/external/v1/...
```

- 토큰은 메모리 캐시 (만료 1분 전 갱신)
- `auto_stop_machines = "stop"` — 트래픽 없으면 VM 정지 → 첫 요청에 ~2초 cold start

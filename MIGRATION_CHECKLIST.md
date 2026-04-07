# TimeOff Club → Claude Code 마이그레이션 체크리스트

## 📁 필수 이전 파일들

### 🔧 설정 파일들
- [ ] `package.json` - 의존성
- [ ] `package-lock.json` - 정확한 버전 락
- [ ] `wrangler.toml` - Cloudflare 설정
- [ ] `next.config.ts` - Next.js 설정
- [ ] `tailwind.config.ts` - 스타일링
- [ ] `tsconfig.json` - TypeScript 설정
- [ ] `postcss.config.mjs` - CSS 처리
- [ ] `playwright.config.ts` - E2E 테스트
- [ ] `vitest.config.ts` - 유닛 테스트

### 🏗️ 소스 코드
- [ ] `app/` - Next.js 13+ App Router 전체
- [ ] `components/` - 재사용 컴포넌트
- [ ] `lib/` - 유틸리티 함수들
- [ ] `public/` - 정적 파일들
- [ ] `middleware.ts` - 미들웨어
- [ ] `.gitignore`

### 🔒 환경변수 (새로 설정 필요)
```bash
# .env.local 파일 내용들
NEXTAUTH_SECRET=...
GITHUB_TOKEN=... (필요시)
# Cloudflare 관련 설정들은 wrangler.toml에 있음
```

### 🗄️ 데이터베이스
- [ ] `db-backup-YYYYMMDD.sql` - D1 데이터 백업
- [ ] Cloudflare D1 새 인스턴스 생성 필요
- [ ] 데이터 임포트 스크립트

## 🚀 배포 스크립트
- [ ] `deploy.sh` - 자동 배포 스크립트
- [ ] `.git/hooks/post-commit` - Git 훅

## 📊 중요 데이터 현황
- **멤버 수**: DB 확인 필요
- **체험권 발급**: 18개 (6개 사용됨)
- **예약 데이터**: 전체 히스토리 보존
- **배지/통계**: 사용자 진행상황

## ⚠️ 주의사항
1. **Cloudflare Pages 프로젝트명** 변경 필요
2. **도메인 설정** (timeoffclub.pages.dev → 새 도메인)
3. **D1 데이터베이스** 새로 생성 + 데이터 이전
4. **Git 히스토리** 보존 권장 (git bundle 활용)

## 🔧 마이그레이션 순서
1. Claude Code에서 새 프로젝트 생성
2. 파일들 복사/붙여넣기
3. Cloudflare D1 새 인스턴스 생성
4. 데이터 임포트
5. 환경변수 설정
6. 빌드 테스트
7. 배포 테스트
8. 도메인 설정 (선택)

## 🧪 테스트 체크리스트
- [ ] 로그인 (멤버 + 체험권)
- [ ] 예약 생성/취소
- [ ] 스팟 운영자 기능
- [ ] 관리자 기능
- [ ] 대화 주제 기능
- [ ] 배지 시스템
- [ ] 푸시 알림

---
**백업일**: $(date)
**현재 커밋**: $(git rev-parse HEAD)
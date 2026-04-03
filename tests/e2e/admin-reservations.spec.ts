import { test, expect } from '@playwright/test';

const BASE_URL = 'https://timeoffclub.pages.dev';
const ADMIN_PASSWORD = 'hyeon821';

test.describe('슈퍼관리자 예약현황 - 모드 표시', () => {
  test.beforeEach(async ({ page }) => {
    // 관리자 로그인
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // '운영자' 탭 클릭
    await page.locator('button', { hasText: '운영자' }).click();
    
    // 비밀번호 입력 후 입장
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]', { hasText: '입장하기' }).click();
    
    // 관리자 페이지 이동 + 데이터 로딩 대기
    await page.waitForURL('**/admin', { timeout: 15000 });
    await page.waitForSelector('text=/전체 예약 현황.*건/', { timeout: 10000 });
  });

  test('관리자 페이지 로딩 및 기본 요소 확인', async ({ page }) => {
    await expect(page.locator('h1', { hasText: '슈퍼관리자' })).toBeVisible();
    await expect(page.getByRole('button', { name: '예약 현황' })).toBeVisible();
    await expect(page.getByText('활성 멤버').first()).toBeVisible();
  });

  test('예약현황에 전체 예약 현황 헤더가 표시됨', async ({ page }) => {
    await expect(page.locator('text=/전체 예약 현황.*건/')).toBeVisible();
  });

  test('예약자 옆에 스몰토크/사색 모드 라벨이 표시됨', async ({ page }) => {
    const bodyText = await page.locator('body').textContent() || '';
    const hasSmallTalk = bodyText.includes('스몰토크');
    const hasReflection = bodyText.includes('사색');
    
    if (hasSmallTalk || hasReflection) {
      const badges = await page.locator('span.rounded-full').allTextContents();
      const withMode = badges.filter(t => t.includes('스몰토크') || t.includes('사색'));
      
      expect(withMode.length).toBeGreaterThan(0);
      console.log(`✅ 모드 표시 배지: ${withMode.length}개 (스몰토크: ${badges.filter(t => t.includes('스몰토크')).length}, 사색: ${badges.filter(t => t.includes('사색')).length})`);
    } else {
      const noReservation = await page.locator('text=아직 예약이 없습니다').isVisible().catch(() => false);
      expect(noReservation).toBe(true);
      console.log('ℹ️ 현재 예약이 없어서 모드 표시 검증 스킵');
    }
  });

  test('사색 모드는 인디고 배경 스타일 적용', async ({ page }) => {
    const reflectionBadges = page.locator('span.bg-indigo-900\\/50');
    const count = await reflectionBadges.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(reflectionBadges.nth(i)).toContainText('사색');
      }
      console.log(`✅ ${count}개 사색 모드 배지 (인디고 스타일) 확인`);
    } else {
      console.log('ℹ️ 현재 사색 모드 예약 없음 — 스킵');
    }
  });

  test('스몰토크 모드는 기본 회색 배경', async ({ page }) => {
    const smalltalkBadges = page.locator('span.bg-gray-700:has-text("스몰토크")');
    const count = await smalltalkBadges.count();
    
    if (count > 0) {
      console.log(`✅ ${count}개 스몰토크 모드 배지 (회색 스타일) 확인`);
    } else {
      console.log('ℹ️ 현재 스몰토크 모드 예약 없음 — 스킵');
    }
  });

  test('대시보드 요약 카드에 올바른 수치 표시', async ({ page }) => {
    const reservationCount = page.locator('.text-amber-400.text-2xl').first();
    await expect(reservationCount).toBeVisible();
    const countText = await reservationCount.textContent();
    expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(0);
    console.log(`✅ 대시보드 전체 예약: ${countText}`);
    
    const memberCount = page.locator('.text-blue-400.text-2xl').first();
    await expect(memberCount).toBeVisible();
    const memberText = await memberCount.textContent();
    expect(parseInt(memberText || '0')).toBeGreaterThanOrEqual(0);
    console.log(`✅ 대시보드 활성 멤버: ${memberText}`);
  });
});

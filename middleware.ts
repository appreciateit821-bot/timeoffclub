import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userCookie = request.cookies.get('user');
  const { pathname } = request.nextUrl;

  // 로그인하지 않은 상태에서 보호된 페이지 접근 시
  if (!userCookie && pathname !== '/login' && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 로그인한 상태에서 로그인 페이지 접근 시
  if (userCookie && pathname === '/login') {
    try {
      const user = JSON.parse(userCookie.value);
      if (user.isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      if (user.isSpotOperator) {
        return NextResponse.redirect(new URL('/admin/spot', request.url));
      }
      return NextResponse.redirect(new URL('/calendar', request.url));
    } catch {
      // 쿠키 파싱 실패 시 로그인 페이지로
      return NextResponse.next();
    }
  }

  // 슈퍼관리자 페이지 접근 제어 (/admin만, /admin/spot 제외)
  if (pathname === '/admin' || (pathname.startsWith('/admin') && !pathname.startsWith('/admin/spot'))) {
    if (!userCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const user = JSON.parse(userCookie.value);
      if (!user.isAdmin) {
        return NextResponse.redirect(new URL('/calendar', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 스팟 운영자 페이지 접근 제어
  if (pathname.startsWith('/admin/spot')) {
    if (!userCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const user = JSON.parse(userCookie.value);
      if (!user.isSpotOperator && !user.isAdmin) {
        return NextResponse.redirect(new URL('/calendar', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

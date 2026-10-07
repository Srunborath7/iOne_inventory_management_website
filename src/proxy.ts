import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_KEY = 'inventory_access_token';

export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_KEY)) return NextResponse.next();

  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/store/:path*', '/dashboard/:path*', '/categories/:path*'],
};

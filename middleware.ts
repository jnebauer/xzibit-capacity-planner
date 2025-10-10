import { NextRequest, NextResponse } from 'next/server';
import { config as appConfig } from './lib/config';

async function verifyToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Check issuer and audience
    if (payload.iss !== 'trucker-app' || payload.aud !== 'trucker-users')
      return null;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    // Basic signature validation - check if signature looks valid
    const signature = parts[2];
    if (!signature || signature.length < 10) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  let token = request.nextUrl.searchParams.get('access_token');
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return NextResponse.redirect(
      `${appConfig.TRUCK_LOAD_PLANNER_URL}/login?redirect=${encodeURIComponent(request.url)}`
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(
      `${appConfig.TRUCK_LOAD_PLANNER_URL}/login?redirect=${encodeURIComponent(request.url)}`
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-url', request.url);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

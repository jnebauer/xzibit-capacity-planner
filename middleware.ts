import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Base64Url → JSON decode helper (Edge-compatible)
function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

    const decoded = atob(base64);
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Token coming from URL (redirect from xzibit apps)
  const urlToken = searchParams.get('access_token');

  // Token from cookies
  const token = request.cookies.get('auth_token')?.value;

  // If token in URL → store cookie + redirect to clean URL
  if (urlToken) {
    const response = NextResponse.redirect(new URL(pathname, request.url));

    response.cookies.set('auth_token', urlToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Security: Don't log actual token value - only log presence
    console.log('🔐 Token received via URL');

    return response;
  }

  // If no token → redirect to login
  if (!token) {
    const xzibitAppsUrl =
      process.env.NEXT_PUBLIC_XZIBIT_APPS_URL || 'http://localhost:3000';
    const loginUrl = `${xzibitAppsUrl}/login`;

    const redirectUrl = new URL(loginUrl);
    redirectUrl.searchParams.set('redirect', request.url);

    return NextResponse.redirect(redirectUrl);
  }

  // Decode token to get user info
  const payload = decodeJwt(token);
  // Security: Don't log actual payload - only log presence
  console.log('🔎 Token decoded successfully');

  // If payload null means token is not JWT or corrupted
  if (!payload) {
    console.log('❌ Token decode failed — not valid JWT format');
    // Redirect to login if token is invalid
    const xzibitAppsUrl =
      process.env.NEXT_PUBLIC_XZIBIT_APPS_URL || 'http://localhost:3000';
    const loginUrl = `${xzibitAppsUrl}/login`;
    const redirectUrl = new URL(loginUrl);
    redirectUrl.searchParams.set('redirect', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Extract user info from payload
  const userRole = payload?.role || null;
  const userId = payload?.userId || payload?.user_id || null;
  const userEmail = payload?.email || payload?.user_email || null;
  const isAdmin = userRole === 'admin';

  // Create response and add user info to headers (for client-side access)
  const response = NextResponse.next();
  
  if (userId) {
    response.headers.set('x-user-id', userId);
  }
  if (userEmail) {
    response.headers.set('x-user-email', userEmail);
  }
  if (userRole) {
    response.headers.set('x-user-role', userRole);
    response.headers.set('x-is-admin', isAdmin ? 'true' : 'false');
  }

  // Set clean URL without access_token
  const cleanUrl = new URL(request.url);
  cleanUrl.searchParams.delete('access_token');
  response.headers.set('x-url', cleanUrl.toString());

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

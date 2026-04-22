import { NextRequest } from 'next/server';

// Edge-compatible Base64Url → JSON decode (mirrors middleware.ts)
function decodeJwt(token: string): Record<string, unknown> | null {
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
  } catch {
    return null;
  }
}

/**
 * Returns true if the request comes from an admin user.
 *
 * Middleware skips /api/* routes, so we re-decode the JWT from the cookie
 * here as belt-and-braces until the /api/* middleware fix lands.
 *
 * In development (NODE_ENV !== 'production') all requests are treated as
 * admin so local testing is frictionless.
 */
export function isAdminRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const token = request.cookies.get('auth_token')?.value;
  if (!token) return false;

  const payload = decodeJwt(token);
  if (!payload) return false;

  return payload.role === 'admin';
}

/**
 * Decode the JWT and return the payload, or null if missing/invalid.
 * Used by server components and layout to determine isAdmin for nav gating.
 */
export function decodeAuthToken(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  return decodeJwt(token);
}

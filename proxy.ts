// proxy.ts (repo root) — Tag Studio auth wall.
//
// Two-layer check, in order:
//   1. Signed session cookie (ts_auth) — set after successful Basic Auth,
//      valid for 30 days, httpOnly + secure + sameSite=strict. Chrome
//      handles cookies reliably on fetch/XHR, unlike Basic Auth which
//      can get flaky when Chrome doesn't attach cached credentials.
//   2. Fallback to Basic Auth — if no cookie or invalid cookie, prompt
//      for TAG_STUDIO_USER / TAG_STUDIO_PASS. On success, set the cookie
//      so subsequent requests skip the prompt entirely.
//
// Fail-safe: if either TAG_STUDIO_USER / TAG_STUDIO_PASS / TAG_STUDIO_COOKIE_SECRET
// is missing, every request 500s. Misconfigured env must never mean unguarded.
//
// Runs at the Node.js edge before any route handler (Next.js 16 proxy.ts).
// Excludes _next/static, _next/image, favicon.ico from the auth check
// (public assets, don't gate them).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'ts_auth';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REALM = 'Tag Studio';

function safeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

// Cookie value format: `<issued_at_ms>.<sha256(issued_at_ms + secret)>`
// The signature ties the cookie to the server secret, so an attacker
// can't forge a valid cookie without the secret. The issued_at_ms
// enforces the 30-day expiration server-side (in case the cookie's own
// maxAge is bypassed somehow).
function signCookie(cookieSecret: string): string {
  const issuedAt = Date.now().toString();
  const sig = createHash('sha256').update(issuedAt + cookieSecret).digest('hex');
  return `${issuedAt}.${sig}`;
}

function verifyCookie(value: string, cookieSecret: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [issuedAtStr, providedSig] = parts;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return false;

  // Server-enforced expiration check (belt + suspenders alongside cookie maxAge).
  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > COOKIE_MAX_AGE_SECONDS * 1000) return false;

  const expectedSig = createHash('sha256').update(issuedAtStr + cookieSecret).digest('hex');
  try {
    return safeEqual(providedSig, expectedSig);
  } catch {
    return false;
  }
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export function proxy(request: NextRequest): NextResponse {
  const expectedUser = process.env.TAG_STUDIO_USER;
  const expectedPass = process.env.TAG_STUDIO_PASS;
  const cookieSecret = process.env.TAG_STUDIO_COOKIE_SECRET;

  // Fail-safe: any missing env var → deny everything until fixed.
  if (!expectedUser || !expectedPass || !cookieSecret) {
    return new NextResponse('Server auth not configured', { status: 500 });
  }

  // Fast path: valid session cookie → let the request through.
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && verifyCookie(cookie, cookieSecret)) {
    return NextResponse.next();
  }

  // Fallback: Basic Auth. If credentials aren't present or don't match,
  // prompt the browser (browsers only show the sign-in dialog when they
  // see WWW-Authenticate on a 401).
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return unauthorized();
  }

  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return unauthorized();
  const providedUser = decoded.slice(0, colonIdx);
  const providedPass = decoded.slice(colonIdx + 1);

  const userOk = safeEqual(providedUser, expectedUser);
  const passOk = safeEqual(providedPass, expectedPass);
  if (!userOk || !passOk) return unauthorized();

  // Basic Auth passed → set the session cookie so future requests skip
  // the Basic Auth check entirely (avoiding Chrome's flaky handling of
  // cached Basic Auth on fetch/XHR).
  const response = NextResponse.next();
  response.cookies.set(COOKIE_NAME, signCookie(cookieSecret), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return response;
}

// Exclude Next.js internals + favicon from the auth check.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

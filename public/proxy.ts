// proxy.ts — HTTP Basic Auth gate for Tag Studio.
//
// Every request is challenged with `WWW-Authenticate: Basic`, prompting the
// browser for credentials on first visit and caching them for the browser
// session. Credentials come from TAG_STUDIO_USER + TAG_STUDIO_PASS env vars
// set in Vercel. Missing env vars → deny (fail-safe: a misconfigured env
// must never mean an unlocked door).
//
// Next.js 16 requires this file to be `proxy.ts` (not `middleware.ts`), the
// export to be named `proxy`, and it runs on the Node.js runtime.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const REALM = 'Tag Studio';

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

// Timing-safe comparison via fixed-length SHA-256 hashes — avoids leaking
// input length or content through the comparison itself.
function safeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function proxy(request: NextRequest): NextResponse {
  const expectedUser = process.env.TAG_STUDIO_USER;
  const expectedPass = process.env.TAG_STUDIO_PASS;

  // Fail-safe: refuse to serve if either env var is unset.
  if (!expectedUser || !expectedPass) return unauthorized();

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized();

  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return unauthorized();
  }

  // Basic auth format is `user:password`. Passwords may contain colons, so
  // split on the FIRST colon only.
  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  if (!safeEqual(user, expectedUser) || !safeEqual(pass, expectedPass)) {
    return unauthorized();
  }

  return NextResponse.next();
}

// Skip Next.js static internals and favicon — the browser sends the cached
// Authorization header on every request anyway, so skipping these here is a
// pure performance optimization, not a security bypass.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

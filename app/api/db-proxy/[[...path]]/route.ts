// app/api/db-proxy/[[...path]]/route.ts
//
// Server-side proxy that forwards every request to the archive Supabase
// project using the service_role key, so the browser never needs write
// permissions on the archive DB. Tag Studio's `lib/supabase.ts` points
// SUPABASE_URL at `/api/db-proxy` (relative); this route catches every
// subpath (like `/api/db-proxy/rest/v1/looks?select=*`) and rewrites the
// upstream request against the real archive origin with server-controlled
// auth headers.
//
// Two layers of protection sit in front of this route:
//   1. proxy.ts (Basic Auth + signed cookie) at the repo root — every
//      request must first pass Tag Studio's auth wall.
//   2. Server-side env var — the service_role key lives only in Vercel
//      env, never in the browser bundle.
//
// Fail-safe: if ARCHIVE_SERVICE_KEY is unset, every request 500s rather
// than passing through unauthenticated.
//
// Runs on the Node.js runtime (Next.js 16 default for route handlers).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ARCHIVE_URL = 'https://rsslbgfbdoqxgogbuuzc.supabase.co';

// Response statuses that MUST NOT carry a body per the Fetch spec. If we
// try to pass a body (even an empty string) with these statuses, the
// NextResponse / Web Response constructor throws
// "Invalid response status code". PostgREST commonly returns 204 for
// successful PATCH/DELETE when the caller sends `Prefer: return=minimal`.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// Request headers to forward from browser to PostgREST. Deliberately
// EXCLUDES `apikey` and `authorization` — always replaced with the
// server-controlled service key.
const FORWARD_REQ_HEADERS = [
  'content-type',
  'prefer',
  'range',
  'range-unit',
  'accept',
  'accept-profile',
  'content-profile',
  'if-match',
  'if-none-match',
];

// Response headers worth surfacing back to the browser so the client sees
// pagination (Content-Range), inserted row locations, etc.
const FORWARD_RES_HEADERS = [
  'content-type',
  'content-range',
  'content-location',
  'location',
];

async function proxyRequest(
  request: NextRequest,
  path: string[] | undefined,
): Promise<NextResponse> {
  const serviceKey = process.env.ARCHIVE_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'ARCHIVE_SERVICE_KEY not configured on server' },
      { status: 500 },
    );
  }

  const subpath = path?.join('/') ?? '';
  const targetUrl = `${ARCHIVE_URL}/${subpath}${request.nextUrl.search}`;

  const forwardHeaders: Record<string, string> = {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
  };
  for (const name of FORWARD_REQ_HEADERS) {
    const value = request.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  const method = request.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' || method === 'DELETE'
      ? undefined
      : await request.text();

  const upstream = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body,
  });

  const responseHeaders: Record<string, string> = {};
  for (const name of FORWARD_RES_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }

  // Null-body statuses (204 / 205 / 304 / 101) can't have a body per the
  // Fetch spec — passing even "" throws "Invalid response status code" in
  // the Response constructor. Read and discard the upstream body, then
  // construct with `null`. All other statuses get the full body text.
  if (NULL_BODY_STATUSES.has(upstream.status)) {
    // Drain the upstream body so the connection can be released; ignore result.
    await upstream.text().catch(() => undefined);
    return new NextResponse(null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  const responseText = await upstream.text();
  return new NextResponse(responseText, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

// Next.js 16 route handler params are async — must be awaited before use.
type RouteContext = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}
export async function PUT(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}
export async function HEAD(request: NextRequest, ctx: RouteContext) {
  return proxyRequest(request, (await ctx.params).path);
}

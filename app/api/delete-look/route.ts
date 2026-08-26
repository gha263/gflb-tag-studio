// app/api/delete-look/route.ts
//
// Server-side proxy for the archive `delete-look` edge function.
//
// The edge function requires a shared secret in the `x-admin-secret` header
// to prevent public abuse (delete-look is destructive: it wipes DB rows AND
// destroys the Cloudinary asset, unrecoverable). This route holds that
// secret in a server-side env var and forwards the call, so the secret
// never enters the browser bundle.
//
// This route inherits Basic Auth protection from proxy.ts at the repo
// root — two gates in front of the edge function, not one.
//
// If DELETE_LOOK_SECRET is unset in the environment, the route returns 500
// rather than proxying without the header, so a config mistake fails
// closed rather than open.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const EDGE_URL =
  'https://rsslbgfbdoqxgogbuuzc.supabase.co/functions/v1/delete-look';

export async function POST(request: NextRequest) {
  const secret = process.env.DELETE_LOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'DELETE_LOOK_SECRET not configured on server' },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const upstream = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
    },
    body: JSON.stringify(body),
  });

  // Pass upstream status + body through unchanged so the browser code sees
  // whatever the edge function returned (400 for bad look_id, 404 for
  // missing look, 500 for actual errors, etc).
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

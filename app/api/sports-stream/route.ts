import { NextRequest, NextResponse } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || req.ip || 'anonymous';
}

function checkRateLimit(req: NextRequest, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const key = getClientKey(req);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1000)),
    } as Record<string, string>,
  };
}

export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, 60);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), ...rate.headers } }
    );
  }

  const { searchParams } = new URL(req.url);
  const matchSlug = searchParams.get('matchSlug') || '';

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(matchSlug)) {
    return NextResponse.json({ error: 'A valid match slug is required' }, { status: 400, headers: rate.headers });
  }

  const apiKey = process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'sport-streaming-api.p.rapidapi.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'Sports streaming is not configured' }, { status: 503, headers: rate.headers });
  }

  try {
    const response = await fetch(`https://${apiHost}/streams/${encodeURIComponent(matchSlug)}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
      next: { revalidate: 30 },
    });
    const body = await response.json();
    if (response.ok) {
      return NextResponse.json(body, {
        headers: {
          ...rate.headers,
          'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }
    return NextResponse.json({ error: 'Stream lookup failed' }, { status: response.status, headers: rate.headers });
  } catch {
    return NextResponse.json({ error: 'Unable to reach the sports streaming service' }, { status: 502, headers: rate.headers });
  }
}

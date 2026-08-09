import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (per-instance, best-effort for serverless)
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || req.ip || 'anonymous';
}

function checkRateLimit(req: NextRequest, limit = 30, windowMs = 60_000) {
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
  const rate = checkRateLimit(req, 30);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), ...rate.headers } }
    );
  }

  const apiKey = process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'TikTok feed is not configured' }, { status: 503, headers: rate.headers });
  }

  const { searchParams } = new URL(req.url);
  const countParam = searchParams.get('count');
  const countValue = countParam ? Number(countParam) : 10;
  const count = Number.isInteger(countValue) ? Math.min(Math.max(countValue, 1), 20) : 10;

  const url = new URL(`https://${apiHost}/challenge/posts`);
  url.searchParams.set('challenge_id', '33380');
  url.searchParams.set('count', String(count));
  url.searchParams.set('cursor', '0');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
      // Cache via fetch cache: revalidate every 60s (mirrors Vercel's s-maxage=60)
      next: { revalidate: 60 },
    });
    const body = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: 'TikTok feed request failed' }, { status: response.status, headers: rate.headers });
    }
    return NextResponse.json(body, {
      headers: {
        ...rate.headers,
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to reach TikTok feed' }, { status: 502, headers: rate.headers });
  }
}

type HeaderValue = string | string[] | undefined;

type RateLimitRequest = {
  headers?: Record<string, HeaderValue>;
};

type RateLimitResponse = {
  setHeader?: (name: string, value: string | number) => void;
};

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function firstHeader(value: HeaderValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getClientKey(req: RateLimitRequest) {
  const forwarded = firstHeader(req.headers?.['x-forwarded-for']);
  return forwarded?.split(',')[0]?.trim()
    || firstHeader(req.headers?.['x-real-ip'])
    || 'anonymous';
}

/** Best-effort per-instance limiter for serverless endpoints. */
export function checkRateLimit(
  req: RateLimitRequest,
  res: RateLimitResponse,
  limit = 60,
  windowMs = 60_000,
) {
  const now = Date.now();
  const key = getClientKey(req);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader?.('X-RateLimit-Limit', limit);
  res.setHeader?.('X-RateLimit-Remaining', remaining);
  res.setHeader?.('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function setPublicCacheHeaders(res: RateLimitResponse, maxAgeSeconds = 30) {
  res.setHeader?.(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=60`,
  );
}

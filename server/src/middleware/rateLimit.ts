interface Bucket {
  count: number;
  resetAt: number;
}

const PRUNE_THRESHOLD = 1_000;

function pruneExpiredBuckets(buckets: Map<string, Bucket>, now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      buckets.delete(key);
      if (buckets.size >= PRUNE_THRESHOLD) {
        pruneExpiredBuckets(buckets, now);
      }
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    bucket.count += 1;
    return bucket.count > maxRequests;
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

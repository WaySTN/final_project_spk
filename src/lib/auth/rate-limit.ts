interface BucketEntry {
  timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, entry);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function getClientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : "local";
  return `${scope}:${ip || "local"}`;
}

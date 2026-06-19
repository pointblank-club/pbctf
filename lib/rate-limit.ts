type RateLimitInfo = {
  count: number;
  lastReset: number;
};

const rateLimits = new Map<string, RateLimitInfo>();

// Cleans up the Map every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, info] of rateLimits.entries()) {
    if (now - info.lastReset > 5 * 60 * 1000) {
      rateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const info = rateLimits.get(ip) || { count: 0, lastReset: now };

  if (now - info.lastReset > windowMs) {
    info.count = 1;
    info.lastReset = now;
    rateLimits.set(ip, info);
    return true;
  }

  if (info.count >= limit) {
    return false;
  }

  info.count++;
  rateLimits.set(ip, info);
  return true;
}

import requestIp from "request-ip";
import dbConnect from "@/lib/db";
import RateLimit from "@/models/RateLimit";

/**
 * Resolve the real client IP.
 */
export function getClientIp(request: Request): string {
  const headers = Object.fromEntries(request.headers);
  return requestIp.getClientIp({ headers })?.trim() || "unknown";
}

/**
 * Fixed-window rate limit backed by MongoDB so it holds across serverless
 * instances (an in-memory Map resets on every cold start). Returns true if the
 * request is allowed, false if the limit is exceeded. Fails open if the store
 * is unreachable so a DB blip can't lock everyone out.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    await dbConnect();

    const window = Math.floor(Date.now() / windowMs);
    const bucketKey = `${key}:${window}`;
    const expiresAt = new Date((window + 1) * windowMs);

    // Atomic per-window counter; upsert avoids a check-then-write race.
    const doc = await RateLimit.findOneAndUpdate(
      { key: bucketKey },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true },
    );

    return doc.count <= limit;
  } catch (error) {
    console.error("[rate-limit] store unreachable, allowing request:", error);
    return true;
  }
}

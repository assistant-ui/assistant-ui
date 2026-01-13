import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create rate limiter instance (optional - requires Upstash Redis)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"), // 10 requests per 10 minutes per IP
      analytics: true,
      prefix: "ai-chat",
    })
  : null;

/**
 * Check if a request should be rate limited
 * @param identifier - Usually IP address or user ID
 * @returns Object with success boolean and reset timestamp
 */
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) {
    // Rate limiting not configured, allow all requests
    console.warn(
      "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.",
    );
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await ratelimit.limit(identifier);

  return result;
}

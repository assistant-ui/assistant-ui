import type { Ratelimit } from "@upstash/ratelimit";

const isDev = process.env.NODE_ENV === "development";

const getRatelimit = async (): Promise<Ratelimit | null> => {
  if (isDev) return null;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(5, "30s"),
  });
};

let ratelimitPromise: Promise<Ratelimit | null> | undefined;

export async function checkRateLimit(req: Request): Promise<Response | null> {
  ratelimitPromise ??= getRatelimit();
  const ratelimit = await ratelimitPromise;
  if (ratelimit) {
    const ip = req.headers.get("x-forwarded-for") ?? "ip";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }
  }
  return null;
}

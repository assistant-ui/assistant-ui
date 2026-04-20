const isDev = process.env.NODE_ENV === "development";

const getRatelimit = async () => {
  if (isDev) return null;
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(5, "30s"),
  });
};

const ratelimitPromise = getRatelimit();

export async function checkRateLimit(req: Request): Promise<Response | null> {
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

const isDev = process.env.NODE_ENV === "development";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const getRatelimits = async () => {
  if (isDev) return null;
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = Redis.fromEnv();
  return {
    ip: new Ratelimit({
      redis,
      prefix: "aui:inference:ip",
      limiter: Ratelimit.fixedWindow(5, "30s"),
    }),
    identity: new Ratelimit({
      redis,
      prefix: "aui:inference:identity",
      limiter: Ratelimit.fixedWindow(
        positiveInteger(process.env.AUI_IDENTITY_REQUESTS_PER_DAY, 50),
        "1d",
      ),
    }),
    global: new Ratelimit({
      redis,
      prefix: "aui:inference:global",
      limiter: Ratelimit.fixedWindow(
        positiveInteger(process.env.AUI_GLOBAL_REQUESTS_PER_DAY, 5_000),
        "1d",
      ),
    }),
  };
};

const ratelimitsPromise = getRatelimits();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function checkRateLimit(
  req: Request,
  identity?: string,
): Promise<Response | null> {
  const ratelimits = await ratelimitsPromise;
  if (!ratelimits) return null;

  const ipResult = await ratelimits.ip.limit(getClientIp(req));
  if (!ipResult.success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  if (identity) {
    const identityResult = await ratelimits.identity.limit(identity);
    if (!identityResult.success) {
      return new Response("Daily usage limit exceeded", { status: 429 });
    }
  }

  const globalResult = await ratelimits.global.limit("all");
  if (!globalResult.success) {
    return new Response("Service usage limit exceeded", { status: 429 });
  }

  return null;
}

const isDev = process.env.NODE_ENV === "development";

export function positiveSafeInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getGlobalDailyRequestLimit(): number {
  const limit = positiveSafeInteger(process.env.AUI_GLOBAL_REQUESTS_PER_DAY, 0);
  if (limit > 0) return limit;
  if (process.env.NODE_ENV === "test") return 5_000;
  throw new Error(
    "AUI_GLOBAL_REQUESTS_PER_DAY must be set to a positive safe integer.",
  );
}

const getRatelimits = async () => {
  if (isDev) return null;
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = Redis.fromEnv();
  return {
    inferenceIpBurst: new Ratelimit({
      redis,
      prefix: "aui:inference:ip:burst",
      limiter: Ratelimit.fixedWindow(5, "30s"),
    }),
    inferenceIpDaily: new Ratelimit({
      redis,
      prefix: "aui:inference:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(process.env.AUI_IP_REQUESTS_PER_DAY, 200),
        "1d",
      ),
    }),
    inferenceIdentity: new Ratelimit({
      redis,
      prefix: "aui:inference:identity",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(process.env.AUI_IDENTITY_REQUESTS_PER_DAY, 50),
        "1d",
      ),
    }),
    inferenceGlobal: new Ratelimit({
      redis,
      prefix: "aui:inference:global",
      limiter: Ratelimit.fixedWindow(getGlobalDailyRequestLimit(), "1d"),
    }),
    sessionIssuanceBurst: new Ratelimit({
      redis,
      prefix: "aui:anonymous-session:ip:burst",
      limiter: Ratelimit.fixedWindow(10, "1m"),
    }),
    sessionIssuanceDaily: new Ratelimit({
      redis,
      prefix: "aui:anonymous-session:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_ANONYMOUS_SESSIONS_PER_IP_PER_DAY,
          100,
        ),
        "1d",
      ),
    }),
    downloadIp: new Ratelimit({
      redis,
      prefix: "aui:download:ip",
      limiter: Ratelimit.fixedWindow(5, "30s"),
    }),
    downloadIdentity: new Ratelimit({
      redis,
      prefix: "aui:download:identity",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(process.env.AUI_DOWNLOAD_REQUESTS_PER_DAY, 20),
        "1d",
      ),
    }),
  };
};

const ratelimitsPromise = getRatelimits();
type Ratelimits = NonNullable<Awaited<typeof ratelimitsPromise>>;

async function runRateLimitCheck(
  req: Request,
  check: (ratelimits: Ratelimits) => Promise<Response | null>,
): Promise<Response | null> {
  try {
    const ratelimits = await ratelimitsPromise;
    if (!ratelimits) return null;
    return await check(ratelimits);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "rate_limit_unavailable",
        requestId: req.headers.get("x-vercel-id"),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Rate limiting temporarily unavailable", {
      status: 503,
    });
  }
}

function firstIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function getClientIp(req: Request): string {
  const customHeader = process.env.AUI_TRUSTED_CLIENT_IP_HEADER?.trim();
  if (customHeader) {
    return firstIp(req.headers.get(customHeader)) ?? "unknown";
  }

  const vercelIp = firstIp(req.headers.get("x-vercel-forwarded-for"));
  if (vercelIp) return vercelIp;

  if (process.env.NODE_ENV !== "production") {
    return firstIp(req.headers.get("x-forwarded-for")) ?? "unknown";
  }

  return "unknown";
}

export async function checkRateLimit(
  req: Request,
  identity?: string,
): Promise<Response | null> {
  return runRateLimitCheck(req, async (ratelimits) => {
    const ip = getClientIp(req);
    const burstResult = await ratelimits.inferenceIpBurst.limit(ip);
    if (!burstResult.success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    const dailyIpResult = await ratelimits.inferenceIpDaily.limit(ip);
    if (!dailyIpResult.success) {
      return new Response("Daily IP usage limit exceeded", { status: 429 });
    }

    const identityResult = identity
      ? await ratelimits.inferenceIdentity.limit(identity)
      : null;
    if (identityResult && !identityResult.success) {
      return new Response("Daily session usage limit exceeded", {
        status: 429,
      });
    }

    const globalResult = await ratelimits.inferenceGlobal.limit("all");
    if (!globalResult.success) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "global_inference_rate_limit_exceeded",
          requestId: req.headers.get("x-vercel-id"),
        }),
      );
      return new Response("Service usage limit exceeded", { status: 429 });
    }

    return null;
  });
}

export async function checkAnonymousSessionIssuanceRateLimit(
  req: Request,
): Promise<Response | null> {
  return runRateLimitCheck(req, async (ratelimits) => {
    const ip = getClientIp(req);
    const [burstResult, dailyResult] = await Promise.all([
      ratelimits.sessionIssuanceBurst.limit(ip),
      ratelimits.sessionIssuanceDaily.limit(ip),
    ]);
    if (!burstResult.success || !dailyResult.success) {
      return new Response("Anonymous session limit exceeded", { status: 429 });
    }
    return null;
  });
}

export async function checkDownloadRateLimit(
  req: Request,
  identity: string,
): Promise<Response | null> {
  return runRateLimitCheck(req, async (ratelimits) => {
    const [ipResult, identityResult] = await Promise.all([
      ratelimits.downloadIp.limit(getClientIp(req)),
      ratelimits.downloadIdentity.limit(identity),
    ]);
    if (!ipResult.success || !identityResult.success) {
      return new Response("Download rate limit exceeded", { status: 429 });
    }
    return null;
  });
}

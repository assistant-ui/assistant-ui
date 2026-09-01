const isDev = process.env.NODE_ENV === "development";

function positiveSafeInteger(
  value: string | undefined,
  fallback: number,
): number {
  const normalized = value?.trim();
  if (!normalized || !/^[1-9]\d*$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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

const getPublicAssistantRateLimits = async () => {
  if (isDev) return null;
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = Redis.fromEnv();
  return {
    ipBurst: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:ip:burst",
      limiter: Ratelimit.fixedWindow(5, "30s"),
    }),
    ipDaily: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_PUBLIC_ASSISTANT_REQUESTS_PER_IP_PER_DAY,
          2_000,
        ),
        "1d",
      ),
    }),
    sessionDaily: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:session:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_PUBLIC_ASSISTANT_REQUESTS_PER_SESSION_PER_DAY,
          500,
        ),
        "1d",
      ),
    }),
    globalDaily: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:global:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_PUBLIC_ASSISTANT_GLOBAL_REQUESTS_PER_DAY,
          20_000,
        ),
        "1d",
      ),
    }),
    globalAlert: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:global:alert",
      limiter: Ratelimit.fixedWindow(1, "10m"),
    }),
    sessionIssuanceBurst: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:session-issuance:burst",
      limiter: Ratelimit.fixedWindow(30, "1m"),
    }),
    sessionIssuanceDaily: new Ratelimit({
      redis,
      prefix: "aui:public-assistant:session-issuance:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_ANONYMOUS_SESSIONS_PER_IP_PER_DAY,
          1_000,
        ),
        "1d",
      ),
    }),
    mcpTemplateIpBurst: new Ratelimit({
      redis,
      prefix: "aui:mcp-template:ip:burst",
      limiter: Ratelimit.fixedWindow(15, "60s"),
    }),
    mcpTemplateIpDaily: new Ratelimit({
      redis,
      prefix: "aui:mcp-template:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_MCP_TEMPLATE_REQUESTS_PER_IP_PER_DAY,
          500,
        ),
        "1d",
      ),
    }),
    mcpTemplateGlobalDaily: new Ratelimit({
      redis,
      prefix: "aui:mcp-template:global:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_MCP_TEMPLATE_GLOBAL_REQUESTS_PER_DAY,
          5_000,
        ),
        "1d",
      ),
    }),
    mcpTemplateGlobalAlert: new Ratelimit({
      redis,
      prefix: "aui:mcp-template:global:alert",
      limiter: Ratelimit.fixedWindow(1, "10m"),
    }),
  };
};

const publicAssistantRateLimitsPromise = getPublicAssistantRateLimits();
void publicAssistantRateLimitsPromise.catch(() => {});

type PublicAssistantRateLimits = NonNullable<
  Awaited<typeof publicAssistantRateLimitsPromise>
>;

function firstIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function getClientIp(request: Request): string | null {
  const vercelIp = firstIp(request.headers.get("x-vercel-forwarded-for"));
  if (vercelIp) return vercelIp;
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.AUI_TRUST_X_FORWARDED_FOR === "1"
  ) {
    return firstIp(request.headers.get("x-forwarded-for"));
  }
  return null;
}

async function runRateLimitChecks(
  request: Request,
  surface: string,
  check: (limits: PublicAssistantRateLimits) => Promise<Response | null>,
): Promise<Response | null> {
  try {
    const limits = await publicAssistantRateLimitsPromise;
    if (!limits) return null;
    return await check(limits);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: `${surface}_rate_limit_unavailable`,
        requestId: request.headers.get("x-vercel-id"),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Public assistant temporarily unavailable", {
      status: 503,
    });
  }
}

function missingClientIpResponse(request: Request, surface: string): Response {
  console.error(
    JSON.stringify({
      level: "error",
      message: `${surface}_client_ip_missing`,
      requestId: request.headers.get("x-vercel-id"),
    }),
  );
  return new Response("Public assistant temporarily unavailable", {
    status: 503,
  });
}

function limitResponse(message: string, reset: number): Response {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1_000));
  return new Response(message, {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}

export async function checkPublicAssistantRateLimit(
  request: Request,
  sessionId: string,
): Promise<Response | null> {
  return runRateLimitChecks(request, "public_assistant", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "public_assistant");

    const ipBurst = await limits.ipBurst.limit(ip);
    if (!ipBurst.success) {
      return limitResponse("Rate limit exceeded", ipBurst.reset);
    }

    const ipDaily = await limits.ipDaily.limit(ip);
    if (!ipDaily.success) {
      return limitResponse("Daily usage limit exceeded", ipDaily.reset);
    }

    const sessionDaily = await limits.sessionDaily.limit(sessionId);
    if (!sessionDaily.success) {
      return limitResponse(
        "Daily anonymous session limit exceeded",
        sessionDaily.reset,
      );
    }

    const globalDaily = await limits.globalDaily.limit("all");
    if (!globalDaily.success) {
      const alert = await limits.globalAlert.limit("all").catch(() => null);
      if (alert?.success) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "public_assistant_global_limit_exceeded",
            requestId: request.headers.get("x-vercel-id"),
          }),
        );
      }
      return limitResponse(
        "Public assistant usage limit exceeded",
        globalDaily.reset,
      );
    }
    return null;
  });
}

export async function checkAnonymousSessionIssuanceRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "public_assistant", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "public_assistant");

    const burst = await limits.sessionIssuanceBurst.limit(ip);
    if (!burst.success) {
      return limitResponse("Anonymous session limit exceeded", burst.reset);
    }
    const daily = await limits.sessionIssuanceDaily.limit(ip);
    if (!daily.success) {
      return limitResponse("Anonymous session limit exceeded", daily.reset);
    }
    return null;
  });
}

export async function checkMcpTemplateToolRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "mcp_template", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "mcp_template");

    const burst = await limits.mcpTemplateIpBurst.limit(ip);
    if (!burst.success) {
      return limitResponse("Template tool rate limit exceeded", burst.reset);
    }

    const daily = await limits.mcpTemplateIpDaily.limit(ip);
    if (!daily.success) {
      return limitResponse("Template tool daily limit exceeded", daily.reset);
    }

    const globalDaily = await limits.mcpTemplateGlobalDaily.limit("all");
    if (!globalDaily.success) {
      const alert = await limits.mcpTemplateGlobalAlert
        .limit("all")
        .catch(() => null);
      if (alert?.success) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "mcp_template_global_limit_exceeded",
            requestId: request.headers.get("x-vercel-id"),
          }),
        );
      }
      return limitResponse(
        "Template tool usage limit exceeded",
        globalDaily.reset,
      );
    }
    return null;
  });
}

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

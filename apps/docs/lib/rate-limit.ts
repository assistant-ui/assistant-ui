const isDev = process.env.NODE_ENV === "development";
import {
  PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE,
  publicAssistantLimitMessage,
} from "@/lib/public-assistant-errors";

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
    mcpDocsIpBurst: new Ratelimit({
      redis,
      prefix: "aui:mcp-docs:ip:burst",
      limiter: Ratelimit.fixedWindow(60, "60s"),
    }),
    mcpDocsIpDaily: new Ratelimit({
      redis,
      prefix: "aui:mcp-docs:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_MCP_DOCS_REQUESTS_PER_IP_PER_DAY,
          5_000,
        ),
        "1d",
      ),
    }),
    mcpDocsGlobalDaily: new Ratelimit({
      redis,
      prefix: "aui:mcp-docs:global:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_MCP_DOCS_GLOBAL_REQUESTS_PER_DAY,
          100_000,
        ),
        "1d",
      ),
    }),
    mcpDocsGlobalAlert: new Ratelimit({
      redis,
      prefix: "aui:mcp-docs:global:alert",
      limiter: Ratelimit.fixedWindow(1, "10m"),
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
    followUpIpBurst: new Ratelimit({
      redis,
      prefix: "aui:follow-up:ip:burst",
      limiter: Ratelimit.fixedWindow(10, "60s"),
    }),
    followUpIpDaily: new Ratelimit({
      redis,
      prefix: "aui:follow-up:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_FOLLOW_UP_REQUESTS_PER_IP_PER_DAY,
          300,
        ),
        "1d",
      ),
    }),
    followUpGlobalDaily: new Ratelimit({
      redis,
      prefix: "aui:follow-up:global:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_FOLLOW_UP_GLOBAL_REQUESTS_PER_DAY,
          20_000,
        ),
        "1d",
      ),
    }),
    followUpGlobalAlert: new Ratelimit({
      redis,
      prefix: "aui:follow-up:global:alert",
      limiter: Ratelimit.fixedWindow(1, "10m"),
    }),
    xuluxDownloadIpBurst: new Ratelimit({
      redis,
      prefix: "aui:xulux-download:ip:burst",
      limiter: Ratelimit.fixedWindow(10, "60s"),
    }),
    xuluxDownloadIpDaily: new Ratelimit({
      redis,
      prefix: "aui:xulux-download:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_XULUX_DOWNLOAD_REQUESTS_PER_IP_PER_DAY,
          200,
        ),
        "1d",
      ),
    }),
    xuluxDownloadGlobalDaily: new Ratelimit({
      redis,
      prefix: "aui:xulux-download:global:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_XULUX_DOWNLOAD_GLOBAL_REQUESTS_PER_DAY,
          2_000,
        ),
        "1d",
      ),
    }),
    xuluxDownloadGlobalAlert: new Ratelimit({
      redis,
      prefix: "aui:xulux-download:global:alert",
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
    return new Response(PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE, {
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
  return new Response(PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE, {
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
      return limitResponse(publicAssistantLimitMessage("Rate"), ipBurst.reset);
    }

    const ipDaily = await limits.ipDaily.limit(ip);
    if (!ipDaily.success) {
      return limitResponse(
        publicAssistantLimitMessage("Daily usage"),
        ipDaily.reset,
      );
    }

    const sessionDaily = await limits.sessionDaily.limit(sessionId);
    if (!sessionDaily.success) {
      return limitResponse(
        publicAssistantLimitMessage("Daily anonymous session"),
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
        publicAssistantLimitMessage("Public assistant usage"),
        globalDaily.reset,
      );
    }
    return null;
  });
}

export async function checkFollowUpSuggestionRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "follow_up", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "follow_up");

    const burst = await limits.followUpIpBurst.limit(ip);
    if (!burst.success) {
      return limitResponse("Follow-up rate limit exceeded", burst.reset);
    }

    const daily = await limits.followUpIpDaily.limit(ip);
    if (!daily.success) {
      return limitResponse("Follow-up daily limit exceeded", daily.reset);
    }

    const globalDaily = await limits.followUpGlobalDaily.limit("all");
    if (!globalDaily.success) {
      const alert = await limits.followUpGlobalAlert
        .limit("all")
        .catch(() => null);
      if (alert?.success) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "follow_up_global_daily_exhausted",
            requestId: request.headers.get("x-vercel-id"),
          }),
        );
      }
      return limitResponse("Follow-up daily limit exceeded", globalDaily.reset);
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
      return limitResponse(
        publicAssistantLimitMessage("Anonymous session"),
        burst.reset,
      );
    }
    const daily = await limits.sessionIssuanceDaily.limit(ip);
    if (!daily.success) {
      return limitResponse(
        publicAssistantLimitMessage("Anonymous session"),
        daily.reset,
      );
    }
    return null;
  });
}

export async function checkMcpDocsToolRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "mcp_docs", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "mcp_docs");

    const burst = await limits.mcpDocsIpBurst.limit(ip);
    if (!burst.success) {
      return limitResponse("Docs tool rate limit exceeded", burst.reset);
    }

    const daily = await limits.mcpDocsIpDaily.limit(ip);
    if (!daily.success) {
      return limitResponse("Docs tool daily limit exceeded", daily.reset);
    }

    const globalDaily = await limits.mcpDocsGlobalDaily.limit("all");
    if (!globalDaily.success) {
      const alert = await limits.mcpDocsGlobalAlert
        .limit("all")
        .catch(() => null);
      if (alert?.success) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "mcp_docs_global_limit_exceeded",
            requestId: request.headers.get("x-vercel-id"),
          }),
        );
      }
      return limitResponse("Docs tool usage limit exceeded", globalDaily.reset);
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
      return limitResponse(
        publicAssistantLimitMessage("Template tool rate"),
        burst.reset,
      );
    }

    const daily = await limits.mcpTemplateIpDaily.limit(ip);
    if (!daily.success) {
      return limitResponse(
        publicAssistantLimitMessage("Template tool daily"),
        daily.reset,
      );
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
        publicAssistantLimitMessage("Template tool usage"),
        globalDaily.reset,
      );
    }
    return null;
  });
}

export async function checkXuluxDownloadProxyRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "xulux_download", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "xulux_download");

    const burst = await limits.xuluxDownloadIpBurst.limit(ip);
    if (!burst.success) {
      return limitResponse(
        publicAssistantLimitMessage("Template download rate"),
        burst.reset,
      );
    }

    const daily = await limits.xuluxDownloadIpDaily.limit(ip);
    if (!daily.success) {
      return limitResponse(
        publicAssistantLimitMessage("Template download daily"),
        daily.reset,
      );
    }

    const globalDaily = await limits.xuluxDownloadGlobalDaily.limit("all");
    if (!globalDaily.success) {
      const alert = await limits.xuluxDownloadGlobalAlert
        .limit("all")
        .catch(() => null);
      if (alert?.success) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "xulux_download_global_limit_exceeded",
            requestId: request.headers.get("x-vercel-id"),
          }),
        );
      }
      return limitResponse(
        publicAssistantLimitMessage("Template download usage"),
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
      return new Response(publicAssistantLimitMessage("Rate"), { status: 429 });
    }
  }
  return null;
}

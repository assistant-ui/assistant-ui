const isDev = process.env.NODE_ENV === "development";
import {
  PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE,
  publicAssistantLimitMessage,
} from "@/lib/public-assistant-errors";

/** Shown as is in the docs assistant panel. */
export const DOCS_CHAT_DAILY_LIMIT_MESSAGE =
  "You have reached the docs assistant's daily limit. It resets within a day.";

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
    docsSearchBurst: new Ratelimit({
      redis,
      prefix: "aui:docs-search:ip:burst",
      limiter: Ratelimit.fixedWindow(60, "1m"),
    }),
    docsSearchDaily: new Ratelimit({
      redis,
      prefix: "aui:docs-search:ip:daily",
      limiter: Ratelimit.fixedWindow(1_000, "1d"),
    }),
    docsSearchGlobal: new Ratelimit({
      redis,
      prefix: "aui:docs-search:global:daily",
      limiter: Ratelimit.fixedWindow(20_000, "1d"),
    }),
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
    // Docs assistant questions on top of the shared public assistant limits.
    // A reader asks a handful a day; these stop one address or one browser
    // session from using the docs assistant as a general model.
    docsChatIpDaily: new Ratelimit({
      redis,
      prefix: "aui:docs-chat:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_DOCS_CHAT_REQUESTS_PER_IP_PER_DAY,
          100,
        ),
        "1d",
      ),
    }),
    docsChatSessionDaily: new Ratelimit({
      redis,
      prefix: "aui:docs-chat:session:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_DOCS_CHAT_REQUESTS_PER_SESSION_PER_DAY,
          40,
        ),
        "1d",
      ),
    }),
    // The public demo chat (/api/chat) on top of the shared public assistant
    // limits. The defaults sit above the busiest single address-day of the
    // 30 days before Nov 26 2026, so a visitor never meets them, while one
    // address or browser session can no longer run the demo as a general
    // model. A request's first prompt is reserved before the model runs
    // (reserveChatTokens), each step's input and output tokens are charged as
    // it runs (recordChatTokens), and the site-wide token ceiling bounds a
    // day's spend.
    chatSessionDaily: new Ratelimit({
      redis,
      prefix: "aui:chat:session:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_CHAT_REQUESTS_PER_SESSION_PER_DAY,
          150,
        ),
        "1d",
      ),
    }),
    chatIpDaily: new Ratelimit({
      redis,
      prefix: "aui:chat:ip:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(process.env.AUI_CHAT_REQUESTS_PER_IP_PER_DAY, 200),
        "1d",
      ),
    }),
    chatIpTokensDaily: new Ratelimit({
      redis,
      prefix: "aui:chat:ip:tokens:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_CHAT_TOKENS_PER_IP_PER_DAY,
          6_000_000,
        ),
        "1d",
      ),
    }),
    chatGlobalTokensDaily: new Ratelimit({
      redis,
      prefix: "aui:chat:global:tokens:daily",
      limiter: Ratelimit.fixedWindow(
        positiveSafeInteger(
          process.env.AUI_CHAT_GLOBAL_TOKENS_PER_DAY,
          200_000_000,
        ),
        "1d",
      ),
    }),
    chatGlobalAlert: new Ratelimit({
      redis,
      prefix: "aui:chat:global:alert",
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
    contactSalesIpBurst: new Ratelimit({
      redis,
      prefix: "aui:contact-sales:ip:burst",
      limiter: Ratelimit.fixedWindow(3, "10m"),
    }),
    contactSalesIpDaily: new Ratelimit({
      redis,
      prefix: "aui:contact-sales:ip:daily",
      limiter: Ratelimit.fixedWindow(10, "1d"),
    }),
    contactSalesGlobalDaily: new Ratelimit({
      redis,
      prefix: "aui:contact-sales:global:daily",
      limiter: Ratelimit.fixedWindow(200, "1d"),
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

export function getClientIp(request: Request): string | null {
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

/**
 * The docs assistant's own daily limits per address and per anonymous
 * session, checked after `checkPublicAssistantRateLimit`.
 */
export async function checkDocsChatRateLimit(
  request: Request,
  sessionId: string,
): Promise<Response | null> {
  return runRateLimitChecks(request, "docs_chat", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "docs_chat");
    // The session is checked first, so a session past its own limit does
    // not keep spending the budget other readers on its address share.
    for (const [limiter, key] of [
      [limits.docsChatSessionDaily, sessionId],
      [limits.docsChatIpDaily, ip],
    ] as const) {
      const result = await limiter.limit(key);
      if (!result.success) {
        return limitResponse(DOCS_CHAT_DAILY_LIMIT_MESSAGE, result.reset);
      }
    }
    return null;
  });
}

/** Logs that the site's demo chat token budget is spent, once per 10 minutes. */
async function alertChatGlobalTokens(
  limits: PublicAssistantRateLimits,
  request: Request,
): Promise<void> {
  const alert = await limits.chatGlobalAlert.limit("all").catch(() => null);
  if (alert?.success) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "chat_global_token_limit_exceeded",
        requestId: request.headers.get("x-vercel-id"),
      }),
    );
  }
}

/**
 * The demo chat's own daily limits, checked after
 * `checkPublicAssistantRateLimit`: requests per anonymous session and per
 * address, then whether the address and the site have tokens left.
 * A request's tokens are then reserved (`reserveChatTokens`) and charged as
 * its steps run (`recordChatTokens`).
 */
export async function checkChatRateLimit(
  request: Request,
  sessionId: string,
): Promise<Response | null> {
  return runRateLimitChecks(request, "chat", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "chat");
    // The session is checked first, so a session past its own limit does
    // not keep spending the budget other visitors on its address share.
    for (const [limiter, key] of [
      [limits.chatSessionDaily, sessionId],
      [limits.chatIpDaily, ip],
    ] as const) {
      const result = await limiter.limit(key);
      if (!result.success) {
        return limitResponse(
          publicAssistantLimitMessage("Daily usage"),
          result.reset,
        );
      }
    }

    const ipTokens = await limits.chatIpTokensDaily.getRemaining(ip);
    if (ipTokens.remaining <= 0) {
      return limitResponse(
        publicAssistantLimitMessage("Daily usage"),
        ipTokens.reset,
      );
    }

    const globalTokens = await limits.chatGlobalTokensDaily.getRemaining("all");
    if (globalTokens.remaining <= 0) {
      await alertChatGlobalTokens(limits, request);
      return limitResponse(
        publicAssistantLimitMessage("Public assistant usage"),
        globalTokens.reset,
      );
    }
    return null;
  });
}

/**
 * Takes a demo chat request's estimated first prompt from the address's and
 * the site's token budgets before the model is called, and refuses the
 * request when either cannot cover it. Each take is one atomic increment, so
 * concurrent requests cannot all start on the same remaining balance. A
 * refused request's takes are given back.
 */
export async function reserveChatTokens(
  request: Request,
  tokens: number,
): Promise<Response | null> {
  return runRateLimitChecks(request, "chat", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "chat");
    const rate = Math.ceil(tokens);
    if (!(rate > 0)) return null;
    const takes = [
      [limits.chatIpTokensDaily, ip, "Daily usage"],
      [limits.chatGlobalTokensDaily, "all", "Public assistant usage"],
    ] as const;
    for (const [index, [limiter, key, scope]] of takes.entries()) {
      const result = await limiter.limit(key, { rate });
      if (!result.success) {
        await Promise.all(
          takes
            .slice(0, index + 1)
            .map(([taken, takenKey]) => taken.limit(takenKey, { rate: -rate })),
        );
        if (limiter === limits.chatGlobalTokensDaily) {
          await alertChatGlobalTokens(limits, request);
        }
        return limitResponse(publicAssistantLimitMessage(scope), result.reset);
      }
    }
    return null;
  });
}

/**
 * Charges demo chat tokens (input and output) to the address and to the
 * site's daily budget: a step's prompt when it starts and the rest of its
 * usage when it ends. Never throws: a store that cannot be reached loses the
 * charge, and the next request's check fails closed.
 */
export async function recordChatTokens(
  request: Request,
  tokens: number | undefined,
): Promise<void> {
  if (typeof tokens !== "number" || !(tokens > 0)) return;
  try {
    const limits = await publicAssistantRateLimitsPromise;
    if (!limits) return;
    const rate = Math.ceil(tokens);
    const ip = getClientIp(request);
    await Promise.all([
      ip ? limits.chatIpTokensDaily.limit(ip, { rate }) : null,
      limits.chatGlobalTokensDaily.limit("all", { rate }),
    ]);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "chat_token_budget_unavailable",
        requestId: request.headers.get("x-vercel-id"),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export async function checkDocsSearchRateLimit(request: Request) {
  return runRateLimitChecks(request, "docs_search", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "docs_search");
    for (const [limiter, key] of [
      [limits.docsSearchBurst, ip],
      [limits.docsSearchDaily, ip],
      [limits.docsSearchGlobal, "all"],
    ] as const) {
      const result = await limiter.limit(key);
      if (!result.success)
        return limitResponse("Search limit exceeded", result.reset);
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

export async function checkContactSalesRateLimit(
  request: Request,
): Promise<Response | null> {
  return runRateLimitChecks(request, "contact_sales", async (limits) => {
    const ip = getClientIp(request);
    if (!ip) return missingClientIpResponse(request, "contact_sales");
    for (const [limiter, key] of [
      [limits.contactSalesIpBurst, ip],
      [limits.contactSalesIpDaily, ip],
      [limits.contactSalesGlobalDaily, "all"],
    ] as const) {
      const result = await limiter.limit(key);
      if (!result.success)
        return limitResponse("Contact sales limit exceeded", result.reset);
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

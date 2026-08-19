import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: new Map<string, boolean>(),
  errors: new Map<string, Error>(),
  calls: [] as Array<{ prefix: string; key: string }>,
  configs: new Map<string, { limit: number; window: string }>(),
}));

vi.mock("@upstash/redis", async (importOriginal) => ({
  ...(await importOriginal()),
  Redis: { fromEnv: () => ({}) },
}));

vi.mock("@upstash/ratelimit", async (importOriginal) => ({
  ...(await importOriginal()),
  Ratelimit: class MockRatelimit {
    static fixedWindow(limit: number, window: string) {
      return { limit, window };
    }

    private readonly prefix: string;

    constructor({
      prefix,
      limiter,
    }: {
      prefix?: string;
      limiter: { limit: number; window: string };
    }) {
      this.prefix = prefix ?? "legacy";
      mocks.configs.set(this.prefix, limiter);
    }

    async limit(key: string) {
      mocks.calls.push({ prefix: this.prefix, key });
      const error = mocks.errors.get(this.prefix);
      if (error) throw error;
      return {
        success: mocks.results.get(this.prefix) ?? true,
        reset: Date.now() + 30_000,
      };
    }
  },
}));

import {
  checkAnonymousSessionIssuanceRateLimit,
  checkPublicAssistantRateLimit,
} from "./rate-limit";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.calls.length = 0;
  mocks.results.clear();
  mocks.errors.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("public assistant rate limits", () => {
  const request = () =>
    new Request("https://www.assistant-ui.com/api/chat", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-forwarded-for": "198.51.100.99",
      },
    });

  it("uses generous anonymous defaults with a global ceiling", async () => {
    await checkPublicAssistantRateLimit(request(), "session_1234567890");

    expect(mocks.configs.get("aui:public-assistant:ip:burst")).toEqual({
      limit: 5,
      window: "30s",
    });
    expect(mocks.configs.get("aui:public-assistant:ip:daily")).toEqual({
      limit: 2_000,
      window: "1d",
    });
    expect(mocks.configs.get("aui:public-assistant:session:daily")).toEqual({
      limit: 500,
      window: "1d",
    });
    expect(mocks.configs.get("aui:public-assistant:global:daily")).toEqual({
      limit: 20_000,
      window: "1d",
    });
    expect(mocks.configs.get("aui:public-assistant:global:alert")).toEqual({
      limit: 1,
      window: "10m",
    });
    expect(
      mocks.configs.get("aui:public-assistant:session-issuance:daily"),
    ).toEqual({
      limit: 1_000,
      window: "1d",
    });
  });

  it("enforces IP, signed-session, and global ceilings", async () => {
    await expect(
      checkPublicAssistantRateLimit(request(), "session_1234567890"),
    ).resolves.toBeNull();

    expect(mocks.calls).toEqual([
      {
        prefix: "aui:public-assistant:ip:burst",
        key: "203.0.113.10",
      },
      {
        prefix: "aui:public-assistant:ip:daily",
        key: "203.0.113.10",
      },
      {
        prefix: "aui:public-assistant:session:daily",
        key: "session_1234567890",
      },
      { prefix: "aui:public-assistant:global:daily", key: "all" },
    ]);
  });

  it.each([
    ["aui:public-assistant:ip:burst", 1],
    ["aui:public-assistant:ip:daily", 2],
    ["aui:public-assistant:session:daily", 3],
    ["aui:public-assistant:global:daily", 5],
  ] as const)(
    "stops after an exhausted %s limit",
    async (prefix, expectedCalls) => {
      mocks.results.set(prefix, false);

      const response = await checkPublicAssistantRateLimit(
        request(),
        "session_1234567890",
      );

      expect(response?.status).toBe(429);
      expect(mocks.calls).toHaveLength(expectedCalls);
    },
  );

  it("fails closed when the rate-limit store is unavailable", async () => {
    mocks.errors.set(
      "aui:public-assistant:ip:burst",
      new Error("Redis unavailable"),
    );

    const response = await checkPublicAssistantRateLimit(
      request(),
      "session_1234567890",
    );

    expect(response?.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("public_assistant_rate_limit_unavailable"),
    );
  });

  it("falls back to the first forwarded IP outside Vercel", async () => {
    const forwardedRequest = new Request(
      "https://www.assistant-ui.com/api/chat",
      { headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.1" } },
    );

    await checkPublicAssistantRateLimit(forwardedRequest, "session_1234567890");

    expect(mocks.calls[0]).toEqual({
      prefix: "aui:public-assistant:ip:burst",
      key: "198.51.100.4",
    });
  });

  it("ignores an untrusted forwarded IP in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const forwardedRequest = new Request(
      "https://www.assistant-ui.com/api/chat",
      { headers: { "x-forwarded-for": "198.51.100.4" } },
    );

    const response = await checkPublicAssistantRateLimit(
      forwardedRequest,
      "session_1234567890",
    );

    expect(response?.status).toBe(503);
    expect(mocks.calls).toHaveLength(0);
  });

  it("accepts a forwarded IP from an explicitly trusted proxy", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUI_TRUST_X_FORWARDED_FOR", "1");
    const forwardedRequest = new Request(
      "https://www.assistant-ui.com/api/chat",
      { headers: { "x-forwarded-for": "198.51.100.4" } },
    );

    await checkPublicAssistantRateLimit(forwardedRequest, "session_1234567890");

    expect(mocks.calls[0]?.key).toBe("198.51.100.4");
  });

  it("fails closed and logs when no client IP is available", async () => {
    const response = await checkPublicAssistantRateLimit(
      new Request("https://www.assistant-ui.com/api/chat"),
      "session_1234567890",
    );

    expect(response?.status).toBe(503);
    expect(mocks.calls).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("public_assistant_client_ip_missing"),
    );
  });

  it("returns Retry-After when a quota is exhausted", async () => {
    mocks.results.set("aui:public-assistant:ip:burst", false);

    const response = await checkPublicAssistantRateLimit(
      request(),
      "session_1234567890",
    );

    expect(response?.headers.get("retry-after")).toBe("30");
  });

  it("rate limits the global ceiling alert", async () => {
    mocks.results.set("aui:public-assistant:global:daily", false);
    mocks.results.set("aui:public-assistant:global:alert", false);

    const response = await checkPublicAssistantRateLimit(
      request(),
      "session_1234567890",
    );

    expect(response?.status).toBe(429);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("limits anonymous-session rotation by IP", async () => {
    await expect(
      checkAnonymousSessionIssuanceRateLimit(request()),
    ).resolves.toBeNull();

    expect(mocks.calls).toEqual([
      {
        prefix: "aui:public-assistant:session-issuance:burst",
        key: "203.0.113.10",
      },
      {
        prefix: "aui:public-assistant:session-issuance:daily",
        key: "203.0.113.10",
      },
    ]);
  });
});

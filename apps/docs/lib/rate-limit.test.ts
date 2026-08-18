import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: new Map<string, boolean>(),
  calls: [] as Array<{ prefix: string; key: string }>,
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

    constructor({ prefix }: { prefix: string }) {
      this.prefix = prefix;
    }

    async limit(key: string) {
      mocks.calls.push({ prefix: this.prefix, key });
      return { success: mocks.results.get(this.prefix) ?? true };
    }
  },
}));

import {
  checkAnonymousSessionIssuanceRateLimit,
  checkDownloadRateLimit,
  checkRateLimit,
  getClientIp,
  positiveSafeInteger,
} from "./rate-limit";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.results.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("positiveSafeInteger", () => {
  it.each(["1.5", "1e3", "10requests", "0", "-2", "9007199254740992"])(
    "rejects malformed or unsafe values (%s)",
    (value) => {
      expect(positiveSafeInteger(value, 50)).toBe(50);
    },
  );

  it("accepts a positive safe integer", () => {
    expect(positiveSafeInteger("250", 50)).toBe(250);
  });
});

describe("getClientIp", () => {
  it("uses Vercel's protected forwarded header in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://www.assistant-ui.com/api/doc/chat", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-forwarded-for": "198.51.100.99",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("fails restrictive when no trusted production header exists", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://www.assistant-ui.com/api/doc/chat", {
      headers: { "x-forwarded-for": "198.51.100.99" },
    });

    expect(getClientIp(request)).toBe("unknown");
  });

  it("supports a documented custom trusted-proxy header", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUI_TRUSTED_CLIENT_IP_HEADER", "x-company-connecting-ip");
    const request = new Request("https://www.assistant-ui.com/api/doc/chat", {
      headers: { "x-company-connecting-ip": "192.0.2.25" },
    });

    expect(getClientIp(request)).toBe("192.0.2.25");
  });
});

describe("checkRateLimit", () => {
  const request = () =>
    new Request("https://www.assistant-ui.com/api/doc/chat", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10" },
    });

  it("enforces burst IP, daily IP, signed session, and global ceilings", async () => {
    await expect(
      checkRateLimit(request(), "anonymous:session-1"),
    ).resolves.toBe(null);
    expect(mocks.calls).toEqual([
      { prefix: "aui:inference:ip:burst", key: "203.0.113.10" },
      { prefix: "aui:inference:ip:daily", key: "203.0.113.10" },
      {
        prefix: "aui:inference:identity",
        key: "anonymous:session-1",
      },
      { prefix: "aui:inference:global", key: "all" },
    ]);
  });

  it("rejects an exhausted burst IP bucket before daily checks", async () => {
    mocks.results.set("aui:inference:ip:burst", false);

    const result = await checkRateLimit(request(), "anonymous:session-1");

    expect(result?.status).toBe(429);
    expect(mocks.calls).toHaveLength(1);
  });

  it.each([
    "aui:inference:ip:daily",
    "aui:inference:identity",
    "aui:inference:global",
  ])("rejects an exhausted %s bucket", async (prefix) => {
    mocks.results.set(prefix, false);

    const result = await checkRateLimit(request(), "anonymous:session-1");

    expect(result?.status).toBe(429);
  });
});

describe("separate non-inference limits", () => {
  const request = new Request(
    "https://www.assistant-ui.com/api/xulux/download",
    { headers: { "x-vercel-forwarded-for": "203.0.113.10" } },
  );

  it("does not consume inference capacity for downloads", async () => {
    await expect(
      checkDownloadRateLimit(request, "user:user_123"),
    ).resolves.toBe(null);

    expect(mocks.calls).toEqual([
      { prefix: "aui:download:ip", key: "203.0.113.10" },
      { prefix: "aui:download:identity", key: "user:user_123" },
    ]);
  });

  it("limits anonymous-session rotation by IP", async () => {
    await expect(checkAnonymousSessionIssuanceRateLimit(request)).resolves.toBe(
      null,
    );

    expect(mocks.calls).toEqual([
      { prefix: "aui:anonymous-session:ip:burst", key: "203.0.113.10" },
      { prefix: "aui:anonymous-session:ip:daily", key: "203.0.113.10" },
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { checkRateLimit } from "./rate-limit";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.results.clear();
});

describe("checkRateLimit", () => {
  it("enforces IP, signed identity, and global ceilings", async () => {
    const request = new Request("https://www.assistant-ui.com/api/doc/chat", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    await expect(checkRateLimit(request, "anonymous:session-1")).resolves.toBe(
      null,
    );
    expect(mocks.calls).toEqual([
      { prefix: "aui:inference:ip", key: "203.0.113.10" },
      {
        prefix: "aui:inference:identity",
        key: "anonymous:session-1",
      },
      { prefix: "aui:inference:global", key: "all" },
    ]);
  });

  it("stops before inference when the identity quota is exhausted", async () => {
    mocks.results.set("aui:inference:identity", false);

    const result = await checkRateLimit(
      new Request("https://www.assistant-ui.com/api/doc/chat"),
      "anonymous:session-1",
    );

    expect(result?.status).toBe(429);
    expect(mocks.calls).toHaveLength(2);
  });
});

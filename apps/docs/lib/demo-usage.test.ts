import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANONYMOUS_CONVERSATIONS_PER_DAY } from "./conversation-limit";

const mocks = vi.hoisted(() => ({
  sets: new Map<string, Set<string>>(),
  getSession: vi.fn(async () => null as { user: { id: string } } | null),
}));

vi.mock("@upstash/redis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@upstash/redis")>()),
  Redis: {
    fromEnv: () => ({
      scard: async (key: string) => mocks.sets.get(key)?.size ?? 0,
      eval: async (
        _script: string,
        [key]: [string],
        [threadId, rawLimit]: [string, string],
      ) => {
        const threads = mocks.sets.get(key) ?? new Set<string>();
        if (threads.has(threadId)) return [1, threads.size];
        if (threads.size >= Number(rawLimit)) return [0, threads.size];
        threads.add(threadId);
        mocks.sets.set(key, threads);
        return [1, threads.size];
      },
    }),
  },
}));

vi.mock("./accounts-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./accounts-auth")>()),
  getSession: mocks.getSession,
}));

import {
  claimConversation,
  readDemoUsage,
  resolveDemoIdentity,
} from "./demo-usage";

beforeEach(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  mocks.sets.clear();
  mocks.getSession.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("demo conversation usage", () => {
  it("reaches the IP cap across fresh anonymous sessions", async () => {
    const ip = "203.0.113.7";
    const cap = 3 * ANONYMOUS_CONVERSATIONS_PER_DAY;
    for (let i = 0; i < cap; i++) {
      const identity = await resolveDemoIdentity(`session-${i}`);
      expect(
        await claimConversation(identity, `thread-${i}`, ip),
      ).toMatchObject({
        allowed: true,
      });
    }

    const freshIdentity = await resolveDemoIdentity("fresh-session");
    expect(await readDemoUsage(freshIdentity, ip)).toMatchObject({
      used: cap,
      limit: cap,
      remaining: 0,
    });
    expect(
      await claimConversation(freshIdentity, "new-thread", ip),
    ).toMatchObject({
      allowed: false,
      usage: { used: cap, limit: cap, remaining: 0 },
    });
    expect(
      await claimConversation(
        await resolveDemoIdentity("session-0"),
        "thread-0",
        ip,
      ),
    ).toMatchObject({
      allowed: true,
    });
    expect(
      await claimConversation(freshIdentity, "new-thread", "203.0.113.8"),
    ).toMatchObject({
      allowed: true,
    });
  });

  it("keeps signed-in conversation usage on the account", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "account-1" } });
    const identity = await resolveDemoIdentity("anonymous-session");

    expect(
      await claimConversation(identity, "thread-1", "203.0.113.7"),
    ).toMatchObject({
      allowed: true,
    });
    expect(await readDemoUsage(identity, "203.0.113.7")).toMatchObject({
      used: 1,
      limit: identity.limit,
    });
    expect([...mocks.sets.keys()]).toEqual([
      expect.stringContaining("user:account-1"),
    ]);
  });
});

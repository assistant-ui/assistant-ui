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
        keys: string[],
        [threadId, rawLimit, , capMember, rawCapLimit]: [
          string,
          string,
          string?,
          string?,
          string?,
        ],
      ) => {
        const [key, capKey] = keys;
        if (!key) throw new Error("Missing session key");
        const threads = mocks.sets.get(key) ?? new Set<string>();
        if (capKey) {
          const capMembers = mocks.sets.get(capKey) ?? new Set<string>();
          if (threads.has(threadId))
            return [1, threads.size, capMembers.size, 0];
          if (threads.size >= Number(rawLimit))
            return [0, threads.size, capMembers.size, 0];
          if (capMembers.size >= Number(rawCapLimit))
            return [0, threads.size, capMembers.size, 1];
          threads.add(threadId);
          capMembers.add(capMember!);
          mocks.sets.set(key, threads);
          mocks.sets.set(capKey, capMembers);
          return [1, threads.size, capMembers.size, 0];
        }
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
    expect(await readDemoUsage(freshIdentity, ip)).toEqual({
      used: 0,
      limit: ANONYMOUS_CONVERSATIONS_PER_DAY,
      remaining: 0,
      resetAt: expect.any(Number),
      sharedLimitReached: true,
    });
    expect(
      await claimConversation(freshIdentity, "new-thread", ip),
    ).toMatchObject({
      allowed: false,
      usage: {
        used: 0,
        limit: ANONYMOUS_CONVERSATIONS_PER_DAY,
        remaining: 0,
        sharedLimitReached: true,
      },
    });
    expect(
      [...mocks.sets.keys()].some((key) => key.includes("fresh-session")),
    ).toBe(false);
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

  it("counts the same thread id from separate sessions twice against the IP cap", async () => {
    const ip = "203.0.113.9";
    const first = await resolveDemoIdentity("first");
    const second = await resolveDemoIdentity("second");

    expect((await claimConversation(first, "same-thread", ip)).allowed).toBe(
      true,
    );
    expect((await claimConversation(second, "same-thread", ip)).allowed).toBe(
      true,
    );
    expect((await readDemoUsage(second, ip)).remaining).toBe(9);
    const capSet = [...mocks.sets.entries()].find(([key]) =>
      key.includes(`ip:${ip}`),
    );
    expect(capSet?.[1].size).toBe(2);
  });

  it("does not mark the network when only the session is full", async () => {
    const identity = await resolveDemoIdentity("own-limit");
    const ip = "203.0.113.10";
    for (let i = 0; i < identity.limit; i++) {
      await claimConversation(identity, `thread-${i}`, ip);
    }

    expect(await readDemoUsage(identity, ip)).toEqual({
      used: identity.limit,
      limit: identity.limit,
      remaining: 0,
      resetAt: expect.any(Number),
    });
    expect(await claimConversation(identity, "new-thread", ip)).toMatchObject({
      allowed: false,
      usage: { used: identity.limit, remaining: 0 },
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

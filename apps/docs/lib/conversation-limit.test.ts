import { describe, expect, it } from "vitest";
import type { Redis } from "@upstash/redis";
import {
  ANONYMOUS_CONVERSATIONS_PER_DAY,
  SIGNED_IN_CONVERSATIONS_PER_DAY,
  conversationLimitFor,
  createConversationCounter,
  nextReset,
} from "./conversation-limit";

// The claim itself is Lua, so what is pinned here is the day key, the reset
// boundary, and the arguments the script is handed.
function fakeRedis(result: [number, number] = [1, 1], readUsed = 2) {
  const calls: { script: string; keys: string[]; args: string[] }[] = [];
  const redis = {
    scard: async () => readUsed,
    eval: async (script: string, keys: string[], args: string[]) => {
      calls.push({ script, keys, args });
      return result;
    },
  } as unknown as Redis;
  return { redis, calls };
}

const NOON = Date.UTC(2026, 8, 4, 12, 0, 0);

describe("conversationLimitFor", () => {
  it("raises the budget once the visitor is known", () => {
    expect(conversationLimitFor(false)).toBe(ANONYMOUS_CONVERSATIONS_PER_DAY);
    expect(conversationLimitFor(true)).toBe(SIGNED_IN_CONVERSATIONS_PER_DAY);
  });
});

describe("nextReset", () => {
  it("lands on the next UTC midnight", () => {
    expect(nextReset(NOON)).toBe(Date.UTC(2026, 8, 5, 0, 0, 0));
    expect(nextReset(Date.UTC(2026, 8, 4, 0, 0, 0))).toBe(
      Date.UTC(2026, 8, 5, 0, 0, 0),
    );
  });
});

describe("createConversationCounter", () => {
  it("keys the set by identity and UTC day", async () => {
    const { redis, calls } = fakeRedis();
    const counter = createConversationCounter(redis, "aui:test:");

    await counter.claim("anon:abc", "thread-1", 3, NOON);

    expect(calls[0]!.keys).toEqual(["aui:test:anon:abc:2026-09-04"]);
    expect(calls[0]!.args.slice(0, 2)).toEqual(["thread-1", "3"]);
  });

  it("reports what is left when the claim is refused", async () => {
    const { redis } = fakeRedis([0, 3]);
    const counter = createConversationCounter(redis, "aui:test:");

    const result = await counter.claim("anon:abc", "thread-4", 3, NOON);

    expect(result.allowed).toBe(false);
    expect(result.usage).toEqual({
      used: 3,
      limit: 3,
      remaining: 0,
      resetAt: Date.UTC(2026, 8, 5, 0, 0, 0),
    });
  });

  it("reads the day without spending anything", async () => {
    const { redis, calls } = fakeRedis();
    const counter = createConversationCounter(redis, "aui:test:");

    expect(await counter.read("anon:abc", 3, NOON)).toEqual({
      used: 2,
      limit: 3,
      remaining: 1,
      resetAt: Date.UTC(2026, 8, 5, 0, 0, 0),
    });
    expect(calls).toHaveLength(0);
  });

  it("clamps read and claim usage to the destination limit", async () => {
    const { redis } = fakeRedis([0, 12], 12);
    const counter = createConversationCounter(redis, "aui:test:");
    const usage = {
      used: 10,
      limit: 10,
      remaining: 0,
      resetAt: Date.UTC(2026, 8, 5, 0, 0, 0),
    };

    expect(await counter.read("user:123", 10, NOON)).toEqual(usage);
    expect(await counter.claim("user:123", "thread-13", 10, NOON)).toEqual({
      allowed: false,
      usage,
    });
  });

  it("merges both identities into the destination day as one script", async () => {
    const { redis, calls } = fakeRedis();
    const counter = createConversationCounter(redis, "aui:test:");

    await counter.merge("anon:abc", "user:123", NOON);

    expect(calls[0]!.script).toContain(
      "redis.call('SUNIONSTORE', intoKey, fromKey, intoKey)\nredis.call('DEL', fromKey)\nredis.call('PEXPIRE', intoKey, ttl)",
    );
    expect(calls[0]!.keys).toEqual([
      "aui:test:anon:abc:2026-09-04",
      "aui:test:user:123:2026-09-04",
    ]);
    expect(calls[0]!.args).toEqual([String(2 * 24 * 60 * 60 * 1000)]);
  });
});

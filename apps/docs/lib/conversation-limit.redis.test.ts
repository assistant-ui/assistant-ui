import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type RedisClientType } from "redis";
import {
  createConversationCounter,
  type ConversationRedisClient,
} from "./conversation-limit";

// The cap, the reset and the merge are Lua, so they only mean anything against
// a server. The test job runs one; a machine without it skips.
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";
const REDIS_TESTS_DISABLED =
  process.env["REDIS_URL"] === undefined && process.env["REDIS_TESTS"] !== "1";

const PREFIX = `aui:www:conversations:test:${process.pid}:`;
const DAY_MS = 24 * 60 * 60 * 1000;
const NOON = Date.UTC(2026, 8, 4, 12, 0, 0);
const MIDNIGHT = NOON + DAY_MS / 2;

describe.skipIf(REDIS_TESTS_DISABLED)("conversation counter on redis", () => {
  let client: RedisClientType;
  let counter: ReturnType<typeof createConversationCounter>;
  let minted = 0;
  const identity = () => `anon:${(minted += 1)}`;
  const dayKey = (who: string, day = "2026-09-04") => `${PREFIX}${who}:${day}`;

  beforeAll(async () => {
    client = createClient({ url: REDIS_URL });
    await client.connect();
    const redis: ConversationRedisClient = {
      scard: (key) => client.sCard(key),
      eval: (script, keys, args) =>
        client.eval(script, { keys, arguments: args }),
    };
    counter = createConversationCounter(redis, PREFIX);
  });

  afterAll(async () => {
    const keys = await client.keys(`${PREFIX}*`);
    if (keys.length > 0) await client.del(keys);
    await client.quit();
  });

  it("refuses the conversation past the cap", async () => {
    const who = identity();
    for (const thread of ["a", "b", "c"]) {
      expect(await counter.claim(who, thread, 3, NOON)).toMatchObject({
        allowed: true,
      });
    }

    expect(await counter.claim(who, "d", 3, NOON)).toEqual({
      allowed: false,
      usage: { used: 3, limit: 3, remaining: 0, resetAt: MIDNIGHT },
    });
  });

  it("keeps a conversation already started free once the cap is reached", async () => {
    const who = identity();
    for (const thread of ["a", "b", "c"]) {
      await counter.claim(who, thread, 3, NOON);
    }

    const again = await counter.claim(who, "a", 3, NOON);

    expect(again.allowed).toBe(true);
    expect(again.usage.used).toBe(3);
    expect((await counter.read(who, 3, NOON)).used).toBe(3);
  });

  it("reads back what the claims spent", async () => {
    const who = identity();
    await counter.claim(who, "a", 10, NOON);
    await counter.claim(who, "a", 10, NOON);
    await counter.claim(who, "b", 10, NOON);

    expect(await counter.read(who, 10, NOON)).toEqual({
      used: 2,
      limit: 10,
      remaining: 8,
      resetAt: MIDNIGHT,
    });
  });

  it("starts the count again on the next UTC day", async () => {
    const who = identity();
    await counter.claim(who, "a", 3, NOON);

    expect((await counter.read(who, 3, MIDNIGHT)).used).toBe(0);
    expect(await counter.claim(who, "a", 3, MIDNIGHT)).toMatchObject({
      allowed: true,
      usage: { used: 1 },
    });
  });

  it("gives the day an expiry so it is not kept forever", async () => {
    const who = identity();
    await counter.claim(who, "a", 3, NOON);

    const ttl = await client.pTTL(dayKey(who));

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(2 * DAY_MS);
  });

  it("merges the anonymous day into the account's and drops the source", async () => {
    const from = identity();
    const into = identity();
    await counter.claim(from, "a", 10, NOON);
    await counter.claim(from, "b", 10, NOON);
    await counter.claim(into, "b", 10, NOON);
    await counter.claim(into, "c", 10, NOON);

    await counter.merge(from, into, NOON);

    expect((await counter.read(into, 10, NOON)).used).toBe(3);
    expect(await client.exists(dayKey(from))).toBe(0);
    expect(await client.pTTL(dayKey(into))).toBeGreaterThan(0);
  });

  it("merges into a day the account has not opened yet", async () => {
    const from = identity();
    const into = identity();
    await counter.claim(from, "a", 10, NOON);

    await counter.merge(from, into, NOON);

    expect((await counter.read(into, 10, NOON)).used).toBe(1);
    expect(await client.pTTL(dayKey(into))).toBeGreaterThan(0);
  });
});

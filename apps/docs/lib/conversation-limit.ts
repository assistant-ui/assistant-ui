import type { Redis } from "@upstash/redis";

export const ANONYMOUS_CONVERSATIONS_PER_DAY = 10;
export const SIGNED_IN_CONVERSATIONS_PER_DAY = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// The set outlives its own day so a request that arrives just after midnight
// still reads a coherent count for the day it belongs to.
const TTL_MS = 2 * DAY_MS;

export type ConversationUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

// Membership is checked before the count so a conversation already started
// today keeps working however many turns it takes.
const CLAIM_SCRIPT = `
local key, threadId, limit, ttl = KEYS[1], ARGV[1], tonumber(ARGV[2]), ARGV[3]
if redis.call('SISMEMBER', key, threadId) == 1 then
  return {1, redis.call('SCARD', key)}
end
local used = redis.call('SCARD', key)
if used >= limit then return {0, used} end
redis.call('SADD', key, threadId)
redis.call('PEXPIRE', key, ttl)
return {1, used + 1}
`;

const MERGE_SCRIPT = `
local fromKey, intoKey, ttl = KEYS[1], KEYS[2], ARGV[1]
redis.call('SUNIONSTORE', intoKey, fromKey, intoKey)
redis.call('DEL', fromKey)
redis.call('PEXPIRE', intoKey, ttl)
return 1
`;

export function conversationLimitFor(signedIn: boolean): number {
  return signedIn
    ? SIGNED_IN_CONVERSATIONS_PER_DAY
    : ANONYMOUS_CONVERSATIONS_PER_DAY;
}

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function nextReset(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
}

export function createConversationCounter(redis: Redis, prefix: string) {
  const key = (identity: string, now: number) =>
    `${prefix}${identity}:${dayKey(now)}`;

  return {
    async read(
      identity: string,
      limit: number,
      now: number = Date.now(),
    ): Promise<ConversationUsage> {
      const used = Math.min(
        (await redis.scard(key(identity, now))) ?? 0,
        limit,
      );
      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        resetAt: nextReset(now),
      };
    },

    async claim(
      identity: string,
      threadId: string,
      limit: number,
      now: number = Date.now(),
    ): Promise<{ allowed: boolean; usage: ConversationUsage }> {
      const [allowed, reportedUsed] = await redis.eval<
        string[],
        [number, number]
      >(
        CLAIM_SCRIPT,
        [key(identity, now)],
        [threadId, String(limit), String(TTL_MS)],
      );
      const used = Math.min(reportedUsed, limit);
      return {
        allowed: allowed === 1,
        usage: {
          used,
          limit,
          remaining: Math.max(0, limit - used),
          resetAt: nextReset(now),
        },
      };
    },

    async merge(
      from: string,
      into: string,
      now: number = Date.now(),
    ): Promise<void> {
      await redis.eval<string[], number>(
        MERGE_SCRIPT,
        [key(from, now), key(into, now)],
        [String(TTL_MS)],
      );
    },
  };
}

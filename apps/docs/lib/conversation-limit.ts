export const ANONYMOUS_CONVERSATIONS_PER_DAY = 10;
export const SIGNED_IN_CONVERSATIONS_PER_DAY = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// The set outlives its own day so a request that arrives just after midnight
// still reads a coherent count for the day it belongs to.
const TTL_MS = 2 * DAY_MS;

/**
 * The slice of a Redis client the counter uses. `@upstash/redis` satisfies it
 * directly; typing the slice rather than that client is what lets the scripts
 * below run against a real server, where a client whose `eval` takes a key
 * count and a flat argument list needs a two line adapter.
 */
export type ConversationRedisClient = {
  scard(key: string): Promise<number>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
};

export type ConversationUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
  /** True when the visitor's network has used its shared allowance, not this visitor's own. */
  sharedLimitReached?: boolean;
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

const CLAIM_WITH_CAP_SCRIPT = `
local sessionKey, capKey = KEYS[1], KEYS[2]
local threadId, sessionLimit, ttl, capMember, capLimit = ARGV[1], tonumber(ARGV[2]), ARGV[3], ARGV[4], tonumber(ARGV[5])
if redis.call('SISMEMBER', sessionKey, threadId) == 1 then
  return {1, redis.call('SCARD', sessionKey), redis.call('SCARD', capKey), 0}
end
local sessionUsed = redis.call('SCARD', sessionKey)
if sessionUsed >= sessionLimit then return {0, sessionUsed, redis.call('SCARD', capKey), 0} end
local capUsed = redis.call('SCARD', capKey)
if capUsed >= capLimit then return {0, sessionUsed, capUsed, 1} end
redis.call('SADD', sessionKey, threadId)
redis.call('SADD', capKey, capMember)
redis.call('PEXPIRE', sessionKey, ttl)
redis.call('PEXPIRE', capKey, ttl)
return {1, sessionUsed + 1, redis.call('SCARD', capKey), 0}
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

export function createConversationCounter(
  redis: ConversationRedisClient,
  prefix: string,
) {
  const key = (identity: string, now: number) =>
    `${prefix}${identity}:${dayKey(now)}`;

  const usageOf = (
    reported: number,
    limit: number,
    now: number,
  ): ConversationUsage => {
    const used = Math.min(reported, limit);
    return { used, limit, remaining: limit - used, resetAt: nextReset(now) };
  };

  return {
    async read(
      identity: string,
      limit: number,
      now: number = Date.now(),
    ): Promise<ConversationUsage> {
      return usageOf(await redis.scard(key(identity, now)), limit, now);
    },

    async claim(
      identity: string,
      threadId: string,
      limit: number,
      now: number = Date.now(),
    ): Promise<{ allowed: boolean; usage: ConversationUsage }> {
      const [allowed, reportedUsed] = (await redis.eval(
        CLAIM_SCRIPT,
        [key(identity, now)],
        [threadId, String(limit), String(TTL_MS)],
      )) as [unknown, unknown];
      return {
        allowed: Number(allowed) === 1,
        usage: usageOf(Number(reportedUsed), limit, now),
      };
    },

    async claimWithCap(
      identity: string,
      threadId: string,
      limit: number,
      capIdentity: string,
      capMember: string,
      capLimit: number,
      now: number = Date.now(),
    ): Promise<{
      allowed: boolean;
      usage: ConversationUsage;
      capUsed: number;
      capRefused: boolean;
    }> {
      const [allowed, sessionUsed, capUsed, capRefused] = (await redis.eval(
        CLAIM_WITH_CAP_SCRIPT,
        [key(identity, now), key(capIdentity, now)],
        [threadId, String(limit), String(TTL_MS), capMember, String(capLimit)],
      )) as [unknown, unknown, unknown, unknown];
      return {
        allowed: Number(allowed) === 1,
        usage: usageOf(Number(sessionUsed), limit, now),
        capUsed: Number(capUsed),
        capRefused: Number(capRefused) === 1,
      };
    },

    async merge(
      from: string,
      into: string,
      now: number = Date.now(),
    ): Promise<void> {
      await redis.eval(
        MERGE_SCRIPT,
        [key(from, now), key(into, now)],
        [String(TTL_MS)],
      );
    },
  };
}

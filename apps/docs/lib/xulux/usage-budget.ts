import type { Redis } from "@upstash/redis";
import {
  budgetDenyMessage,
  evaluateBudget,
  estimateMicroUsd,
  getBudgetLimits,
  utcDateKey,
  type BudgetDenyCode,
  type TokenUsage,
} from "./usage-budget-codes";

export type {
  BudgetDenyCode,
  BudgetLimits,
  BudgetSnapshot,
} from "./usage-budget-codes";
export {
  evaluateBudget,
  estimateMicroUsd,
  getBudgetLimits,
  budgetDenyMessage,
  isDailyLimitCode,
} from "./usage-budget-codes";

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;
const DAY_TTL_SEC = 48 * 60 * 60;

function sessionTurnsKey(sessionId: string): string {
  return `xulux:sess:${sessionId}:turns`;
}

function sessionSpentKey(sessionId: string): string {
  return `xulux:sess:${sessionId}:spent`;
}

function dailySpentKey(distinctId: string, date: string): string {
  return `xulux:day:${distinctId}:${date}:spent`;
}

function dailySessionsKey(distinctId: string, date: string): string {
  return `xulux:day:${distinctId}:${date}:sessions`;
}

function networkSpentKey(networkId: string, date: string): string {
  return `xulux:net:${networkId}:${date}:spent`;
}

function sessionRegisteredKey(sessionId: string, date: string): string {
  return `xulux:sess:${sessionId}:reg:${date}`;
}

export function isUsageBudgetEnabled(): boolean {
  if (process.env.XULUX_USAGE_BUDGET_ENABLED === "0") return false;
  return true;
}

type UsageBudgetStore = {
  loadSnapshot: (
    sessionId: string,
    distinctId: string,
    date: string,
  ) => Promise<import("./usage-budget-codes").BudgetSnapshot>;
  registerChat: (
    sessionId: string,
    distinctId: string,
    date: string,
  ) => Promise<number>;
  /** Adds `delta` (default 1) to the session's turn count; returns the count. */
  incrementTurn: (sessionId: string, delta?: number) => Promise<number>;
  /** Adds to the session and daily totals and returns the new totals. */
  addSpend: (
    sessionId: string,
    distinctId: string,
    date: string,
    microUsd: number,
  ) => Promise<{ sessionSpentMicroUsd: number; dailySpentMicroUsd: number }>;
  loadNetworkSpent: (networkId: string, date: string) => Promise<number>;
  /** Adds to the IP's daily total and returns the new total. */
  addNetworkSpend: (
    networkId: string,
    date: string,
    microUsd: number,
  ) => Promise<number>;
};

function pruneStaleMemoryDailyKeys(
  currentDate: string,
  ...maps: Map<string, unknown>[]
) {
  for (const map of maps) {
    for (const key of map.keys()) {
      if (!key.endsWith(`:${currentDate}`)) map.delete(key);
    }
  }
}

function createMemoryStore(): UsageBudgetStore {
  const turns = new Map<string, number>();
  const sessionSpent = new Map<string, number>();
  const dailySpent = new Map<string, number>();
  const dailySessions = new Map<string, Set<string>>();
  const registered = new Set<string>();
  const networkSpent = new Map<string, number>();

  return {
    async loadSnapshot(sessionId, distinctId, date) {
      pruneStaleMemoryDailyKeys(date, dailySpent, dailySessions, networkSpent);
      const sessionTurns = turns.get(sessionId) ?? 0;
      return {
        sessionTurns,
        sessionSpentMicroUsd: sessionSpent.get(sessionId) ?? 0,
        dailySpentMicroUsd: dailySpent.get(`${distinctId}:${date}`) ?? 0,
        dailyChatCount: dailySessions.get(`${distinctId}:${date}`)?.size ?? 0,
        isNewSession:
          sessionTurns === 0 && !registered.has(`${sessionId}:${date}`),
      };
    },
    async registerChat(sessionId, distinctId, date) {
      const regKey = `${sessionId}:${date}`;
      if (registered.has(regKey)) {
        return dailySessions.get(`${distinctId}:${date}`)?.size ?? 0;
      }
      registered.add(regKey);
      const dayKey = `${distinctId}:${date}`;
      const set = dailySessions.get(dayKey) ?? new Set<string>();
      set.add(sessionId);
      dailySessions.set(dayKey, set);
      return set.size;
    },
    async incrementTurn(sessionId, delta = 1) {
      const next = (turns.get(sessionId) ?? 0) + delta;
      turns.set(sessionId, next);
      return next;
    },
    async addSpend(sessionId, distinctId, date, microUsd) {
      const sessionSpentMicroUsd =
        (sessionSpent.get(sessionId) ?? 0) + microUsd;
      sessionSpent.set(sessionId, sessionSpentMicroUsd);
      const dayKey = `${distinctId}:${date}`;
      const dailySpentMicroUsd = (dailySpent.get(dayKey) ?? 0) + microUsd;
      dailySpent.set(dayKey, dailySpentMicroUsd);
      return { sessionSpentMicroUsd, dailySpentMicroUsd };
    },
    async loadNetworkSpent(networkId, date) {
      return networkSpent.get(`${networkId}:${date}`) ?? 0;
    },
    async addNetworkSpend(networkId, date, microUsd) {
      const key = `${networkId}:${date}`;
      const total = (networkSpent.get(key) ?? 0) + microUsd;
      networkSpent.set(key, total);
      return total;
    },
  };
}

function createRedisStore(redis: Redis): UsageBudgetStore {
  return {
    async loadSnapshot(sessionId, distinctId, date) {
      const [
        sessionTurnsRaw,
        sessionSpentRaw,
        dailySpentRaw,
        chatCount,
        registered,
      ] = await Promise.all([
        redis.get<number>(sessionTurnsKey(sessionId)),
        redis.get<number>(sessionSpentKey(sessionId)),
        redis.get<number>(dailySpentKey(distinctId, date)),
        redis.scard(dailySessionsKey(distinctId, date)),
        redis.get(sessionRegisteredKey(sessionId, date)),
      ]);

      const sessionTurns = sessionTurnsRaw ?? 0;
      return {
        sessionTurns,
        sessionSpentMicroUsd: sessionSpentRaw ?? 0,
        dailySpentMicroUsd: dailySpentRaw ?? 0,
        dailyChatCount: chatCount ?? 0,
        isNewSession: sessionTurns === 0 && !registered,
      };
    },
    async registerChat(sessionId, distinctId, date) {
      const regKey = sessionRegisteredKey(sessionId, date);
      const wasSet = await redis.set(regKey, "1", {
        nx: true,
        ex: DAY_TTL_SEC,
      });
      if (!wasSet) {
        return redis.scard(dailySessionsKey(distinctId, date));
      }
      await redis.sadd(dailySessionsKey(distinctId, date), sessionId);
      await redis.expire(dailySessionsKey(distinctId, date), DAY_TTL_SEC);
      return redis.scard(dailySessionsKey(distinctId, date));
    },
    async incrementTurn(sessionId, delta = 1) {
      const turns = await redis.incrby(sessionTurnsKey(sessionId), delta);
      await redis.expire(sessionTurnsKey(sessionId), SESSION_TTL_SEC);
      return turns;
    },
    async addSpend(sessionId, distinctId, date, microUsd) {
      const [sessionSpentMicroUsd, dailySpentMicroUsd] = await Promise.all([
        redis.incrby(sessionSpentKey(sessionId), microUsd),
        redis.incrby(dailySpentKey(distinctId, date), microUsd),
      ]);
      await Promise.all([
        redis.expire(sessionSpentKey(sessionId), SESSION_TTL_SEC),
        redis.expire(dailySpentKey(distinctId, date), DAY_TTL_SEC),
      ]);
      return { sessionSpentMicroUsd, dailySpentMicroUsd };
    },
    async loadNetworkSpent(networkId, date) {
      return (await redis.get<number>(networkSpentKey(networkId, date))) ?? 0;
    },
    async addNetworkSpend(networkId, date, microUsd) {
      const total = await redis.incrby(
        networkSpentKey(networkId, date),
        microUsd,
      );
      await redis.expire(networkSpentKey(networkId, date), DAY_TTL_SEC);
      return total;
    },
  };
}

let storePromise: Promise<UsageBudgetStore | null> | null = null;
let memoryStore: UsageBudgetStore | null = null;

async function getStore(): Promise<UsageBudgetStore | null> {
  if (!isUsageBudgetEnabled()) return null;

  const forceMemory =
    process.env.XULUX_USAGE_BUDGET_STORE === "memory" ||
    !process.env.UPSTASH_REDIS_REST_URL;

  if (forceMemory) {
    memoryStore ??= createMemoryStore();
    return memoryStore;
  }

  storePromise ??= (async () => {
    try {
      const { Redis } = await import("@upstash/redis");
      return createRedisStore(Redis.fromEnv());
    } catch (error) {
      console.error(
        "[usage-budget] Redis init failed; using memory store",
        error,
      );
      memoryStore ??= createMemoryStore();
      return memoryStore;
    }
  })();
  return storePromise;
}

export type BeginTurnResult = {
  denied: Response | null;
  budgetDate: string;
  /** Spend held for this turn; pass it to `finishTurn`. */
  reservedMicroUsd: number;
};

function denyResponse(code: BudgetDenyCode): Response {
  const limits = getBudgetLimits();
  return Response.json(
    { error: budgetDenyMessage(code, limits), code },
    { status: 429 },
  );
}

/**
 * Starts a turn unless a limit is reached. `networkId` is the trusted client
 * IP: anonymous sessions are cheap to mint, so the daily spend is also capped
 * across every session from one IP.
 *
 * The turn counter and a spend reservation are added before the limits are
 * checked, using the totals the store returns. Concurrent turns each see a
 * different total, so they cannot all pass on the same snapshot. The
 * reservation stays charged if the turn never reports usage (for example
 * when the model call fails); `finishTurn` replaces it with the real cost.
 */
export async function beginTurn(
  sessionId: string,
  distinctId: string,
  networkId?: string | null,
): Promise<BeginTurnResult> {
  const budgetDate = utcDateKey();
  const store = await getStore();
  if (!store) return { denied: null, budgetDate, reservedMicroUsd: 0 };

  const limits = getBudgetLimits();
  const deniedWith = (code: BudgetDenyCode): BeginTurnResult => ({
    denied: denyResponse(code),
    budgetDate,
    reservedMicroUsd: 0,
  });
  const snap = await store.loadSnapshot(sessionId, distinctId, budgetDate);
  if (networkId) {
    snap.networkDailySpentMicroUsd = await store.loadNetworkSpent(
      networkId,
      budgetDate,
    );
  }
  const deny = evaluateBudget(snap, limits);
  if (deny) return deniedWith(deny);

  // Reserve spend first so a refused reservation leaves the turn and chat
  // counters untouched. Each later refusal hands the reservation back.
  const reserve = limits.turnReserveMicroUsd;
  const totals = await store.addSpend(
    sessionId,
    distinctId,
    budgetDate,
    reserve,
  );
  const networkTotal = networkId
    ? await store.addNetworkSpend(networkId, budgetDate, reserve)
    : null;
  const release = async (code: BudgetDenyCode) => {
    await store.addSpend(sessionId, distinctId, budgetDate, -reserve);
    if (networkId) {
      await store.addNetworkSpend(networkId, budgetDate, -reserve);
    }
    return deniedWith(code);
  };
  // Compare the totals from before this reservation, as evaluateBudget does:
  // a turn may start while spend is under the cap. Concurrent turns each see
  // a different total, so together they pass the cap by at most one
  // reservation.
  if (totals.dailySpentMicroUsd - reserve >= limits.dailyBudgetMicroUsd) {
    return release("DAILY_BUDGET_EXCEEDED");
  }
  if (
    networkTotal !== null &&
    networkTotal - reserve >= limits.networkDailyBudgetMicroUsd
  ) {
    return release("NETWORK_DAILY_BUDGET_EXCEEDED");
  }
  if (totals.sessionSpentMicroUsd - reserve >= limits.chatBudgetMicroUsd) {
    return release("CHAT_BUDGET_EXCEEDED");
  }

  if (snap.isNewSession) {
    const chatCount = await store.registerChat(
      sessionId,
      distinctId,
      budgetDate,
    );
    if (chatCount > limits.maxChatsPerDay) {
      return release("DAILY_CHAT_LIMIT");
    }
  }

  const turns = await store.incrementTurn(sessionId);
  if (turns > limits.maxTurnsPerChat) {
    await store.incrementTurn(sessionId, -1);
    return release("CHAT_TURN_LIMIT");
  }

  return { denied: null, budgetDate, reservedMicroUsd: reserve };
}

export async function finishTurn(
  sessionId: string,
  distinctId: string,
  usage: TokenUsage,
  budgetDate = utcDateKey(),
  networkId?: string | null,
  reservedMicroUsd = 0,
): Promise<void> {
  const store = await getStore();
  if (!store) return;

  // A turn with no reported tokens (an abort before any step finished)
  // keeps its reservation as the charge.
  if (!(usage.inputTokens ?? 0) && !(usage.outputTokens ?? 0)) return;

  // Settle the reservation: charge the real cost in its place.
  const microUsd = estimateMicroUsd(usage) - reservedMicroUsd;
  if (microUsd === 0) return;
  await store.addSpend(sessionId, distinctId, budgetDate, microUsd);
  if (networkId) {
    await store.addNetworkSpend(networkId, budgetDate, microUsd);
  }
}

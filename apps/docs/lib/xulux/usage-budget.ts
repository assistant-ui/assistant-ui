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
  incrementTurn: (sessionId: string) => Promise<number>;
  addSpend: (
    sessionId: string,
    distinctId: string,
    date: string,
    microUsd: number,
  ) => Promise<void>;
};

function pruneStaleMemoryDailyKeys(
  dailySpent: Map<string, number>,
  dailySessions: Map<string, Set<string>>,
  currentDate: string,
) {
  for (const key of dailySpent.keys()) {
    if (!key.endsWith(`:${currentDate}`)) dailySpent.delete(key);
  }
  for (const key of dailySessions.keys()) {
    if (!key.endsWith(`:${currentDate}`)) dailySessions.delete(key);
  }
}

function createMemoryStore(): UsageBudgetStore {
  const turns = new Map<string, number>();
  const sessionSpent = new Map<string, number>();
  const dailySpent = new Map<string, number>();
  const dailySessions = new Map<string, Set<string>>();
  const registered = new Set<string>();

  return {
    async loadSnapshot(sessionId, distinctId, date) {
      pruneStaleMemoryDailyKeys(dailySpent, dailySessions, date);
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
    async incrementTurn(sessionId) {
      const next = (turns.get(sessionId) ?? 0) + 1;
      turns.set(sessionId, next);
      return next;
    },
    async addSpend(sessionId, distinctId, date, microUsd) {
      sessionSpent.set(
        sessionId,
        (sessionSpent.get(sessionId) ?? 0) + microUsd,
      );
      const dayKey = `${distinctId}:${date}`;
      dailySpent.set(dayKey, (dailySpent.get(dayKey) ?? 0) + microUsd);
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
    async incrementTurn(sessionId) {
      const turns = await redis.incr(sessionTurnsKey(sessionId));
      await redis.expire(sessionTurnsKey(sessionId), SESSION_TTL_SEC);
      return turns;
    },
    async addSpend(sessionId, distinctId, date, microUsd) {
      await Promise.all([
        redis.incrby(sessionSpentKey(sessionId), microUsd),
        redis.incrby(dailySpentKey(distinctId, date), microUsd),
      ]);
      await Promise.all([
        redis.expire(sessionSpentKey(sessionId), SESSION_TTL_SEC),
        redis.expire(dailySpentKey(distinctId, date), DAY_TTL_SEC),
      ]);
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
};

function denyResponse(code: BudgetDenyCode): Response {
  const limits = getBudgetLimits();
  return Response.json(
    { error: budgetDenyMessage(code, limits), code },
    { status: 429 },
  );
}

export async function beginTurn(
  sessionId: string,
  distinctId: string,
): Promise<BeginTurnResult> {
  const budgetDate = utcDateKey();
  const store = await getStore();
  if (!store) return { denied: null, budgetDate };

  const limits = getBudgetLimits();
  const snap = await store.loadSnapshot(sessionId, distinctId, budgetDate);
  const deny = evaluateBudget(snap, limits);
  if (deny) return { denied: denyResponse(deny), budgetDate };

  if (snap.isNewSession) {
    const chatCount = await store.registerChat(
      sessionId,
      distinctId,
      budgetDate,
    );
    if (chatCount > limits.maxChatsPerDay) {
      return { denied: denyResponse("DAILY_CHAT_LIMIT"), budgetDate };
    }
  }

  await store.incrementTurn(sessionId);
  return { denied: null, budgetDate };
}

export async function finishTurn(
  sessionId: string,
  distinctId: string,
  usage: TokenUsage,
  modelId?: string,
  budgetDate = utcDateKey(),
): Promise<void> {
  const store = await getStore();
  if (!store) return;

  const microUsd = estimateMicroUsd(usage, modelId);
  await store.addSpend(sessionId, distinctId, budgetDate, microUsd);
}

/** @internal Test-only memory store for integration checks. */
export function createTestUsageBudgetStore(): UsageBudgetStore {
  return createMemoryStore();
}

/** @internal Runs beginTurn/finishTurn against an injected store (tests). */
export async function beginTurnWithStore(
  store: UsageBudgetStore,
  sessionId: string,
  distinctId: string,
  date = utcDateKey(),
): Promise<Response | null> {
  const limits = getBudgetLimits();
  const snap = await store.loadSnapshot(sessionId, distinctId, date);
  const deny = evaluateBudget(snap, limits);
  if (deny) return denyResponse(deny);

  if (snap.isNewSession) {
    const chatCount = await store.registerChat(sessionId, distinctId, date);
    if (chatCount > limits.maxChatsPerDay) {
      return denyResponse("DAILY_CHAT_LIMIT");
    }
  }

  await store.incrementTurn(sessionId);
  return null;
}

export async function finishTurnWithStore(
  store: UsageBudgetStore,
  sessionId: string,
  distinctId: string,
  usage: TokenUsage,
  modelId?: string,
  date = utcDateKey(),
): Promise<void> {
  const microUsd = estimateMicroUsd(usage, modelId);
  await store.addSpend(sessionId, distinctId, date, microUsd);
}

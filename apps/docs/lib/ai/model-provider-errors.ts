import "server-only";

import { Redis } from "@upstash/redis";
import {
  MODEL_PROVIDER_LIMIT_MESSAGE,
  MODEL_PROVIDER_UNAVAILABLE_MESSAGE,
} from "@/lib/public-assistant-errors";

export type ModelProviderFailure = "limit" | "unavailable";

/** The stream's default error text, kept for failures that are not the provider's. */
export const GENERIC_STREAM_ERROR_MESSAGE = "An error occurred.";

const LIMIT_PATTERN =
  /usage limit|quota|rate.?limit|too many requests|limit (?:exceeded|reached)|reached your .*limit|insufficient.?(?:credits|balance|funds)/i;

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  statusCode?: unknown;
  responseBody?: unknown;
  lastError?: unknown;
  errors?: unknown;
  cause?: unknown;
};

/** Walks retry wrappers (`errors`, `lastError`) and `cause` chains, newest first. */
function* errorChain(error: unknown, depth = 0): Generator<ErrorLike> {
  if (depth > 5 || error === null || typeof error !== "object") return;
  const e = error as ErrorLike;
  yield e;
  if (e.lastError !== undefined) yield* errorChain(e.lastError, depth + 1);
  if (Array.isArray(e.errors)) {
    for (const inner of [...e.errors].reverse()) {
      if (inner !== e.lastError) yield* errorChain(inner, depth + 1);
    }
  }
  if (e.cause !== undefined) yield* errorChain(e.cause, depth + 1);
}

const isApiCallError = (e: ErrorLike) =>
  e.name === "AI_APICallError" || typeof e.statusCode === "number";

/**
 * Classifies an error thrown by the model provider call: quota and rate limits
 * as `limit`; 5xx, auth failures, and unreachable hosts as `unavailable`. Any
 * other error (a tool, a bad request) is not the provider's and stays generic.
 * Only APICallErrors count, because tool failures reach the same `onError`.
 */
export function classifyModelProviderError(
  error: unknown,
): ModelProviderFailure | undefined {
  let unavailable = false;
  for (const e of errorChain(error)) {
    const status = typeof e.statusCode === "number" ? e.statusCode : undefined;
    const text = [e.message, e.responseBody]
      .filter((v): v is string => typeof v === "string")
      .join("\n");

    if (status === 429 || status === 402) return "limit";
    if (isApiCallError(e) && LIMIT_PATTERN.test(text)) return "limit";
    if (status !== undefined) {
      if (status >= 500 || status === 401 || status === 403) unavailable = true;
    } else if (e.name === "AI_APICallError") {
      // The SDK wraps a host it cannot reach as an APICallError with no status.
      unavailable = true;
    }
  }
  return unavailable ? "unavailable" : undefined;
}

export function modelProviderErrorMessage(
  failure: ModelProviderFailure,
): string {
  return failure === "limit"
    ? MODEL_PROVIDER_LIMIT_MESSAGE
    : MODEL_PROVIDER_UNAVAILABLE_MESSAGE;
}

/** How long one provider failure keeps the status badge at degraded. */
export const MODEL_PROVIDER_FAILURE_WINDOW_MS = 5 * 60_000;
/** Bounds how often /api/status reads the shared failure marker. */
const HEALTH_CACHE_MS = 60_000;
const FAILURE_KEY = "aui:www:model-provider:last-failure";

const hasRedis = () =>
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
const getRedis = () => {
  if (!hasRedis()) return null;
  redis ??= Redis.fromEnv();
  return redis;
};

let lastLocalFailureAt = 0;
let healthCache: { at: number; degraded: boolean } | null = null;

/**
 * Notes a provider failure so /api/status can report degraded. The marker is a
 * single Redis key with a TTL (shared across instances); without Redis, only
 * this instance remembers it. Never throws and never delays the response.
 */
export function recordModelProviderFailure(now = Date.now()): void {
  lastLocalFailureAt = now;
  healthCache = null;
  const client = getRedis();
  if (!client) return;
  void client
    .set(FAILURE_KEY, now, {
      px: MODEL_PROVIDER_FAILURE_WINDOW_MS,
    })
    .catch((error: unknown) =>
      console.warn("[ai/model-provider] failed to record failure", error),
    );
}

/** Whether the model provider failed within the window, cached for a minute. */
export async function isModelProviderDegraded(
  now = Date.now(),
): Promise<boolean> {
  if (healthCache && now - healthCache.at < HEALTH_CACHE_MS) {
    return healthCache.degraded;
  }

  let lastFailureAt = lastLocalFailureAt;
  const client = getRedis();
  if (client) {
    try {
      const stored = Number(await client.get(FAILURE_KEY));
      if (Number.isFinite(stored)) {
        lastFailureAt = Math.max(lastFailureAt, stored);
      }
    } catch {
      // An unreadable marker says nothing about the provider.
    }
  }

  const degraded =
    lastFailureAt > 0 && now - lastFailureAt < MODEL_PROVIDER_FAILURE_WINDOW_MS;
  healthCache = { at: now, degraded };
  return degraded;
}

/**
 * The stream's `onError`: logs the raw error server-side, records provider
 * failures, and returns copy that carries no provider internals.
 */
export function toPublicStreamError(error: unknown): string {
  const failure = classifyModelProviderError(error);
  if (!failure) return GENERIC_STREAM_ERROR_MESSAGE;
  recordModelProviderFailure();
  return modelProviderErrorMessage(failure);
}

/** Test hook: forgets the local failure marker and the health cache. */
export function resetModelProviderHealth(): void {
  lastLocalFailureAt = 0;
  healthCache = null;
}

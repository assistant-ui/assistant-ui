import { beforeEach, describe, expect, it } from "vitest";
import { APICallError, streamText, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import {
  GENERIC_STREAM_ERROR_MESSAGE,
  MODEL_PROVIDER_FAILURE_WINDOW_MS,
  classifyModelProviderError,
  isModelProviderDegraded,
  recordModelProviderFailure,
  resetModelProviderHealth,
  toPublicStreamError,
} from "./model-provider-errors";
import {
  MODEL_PROVIDER_LIMIT_MESSAGE,
  MODEL_PROVIDER_UNAVAILABLE_MESSAGE,
} from "@/lib/public-assistant-errors";

const GATEWAY_URL = "https://gateway.example.test/v1/chat/completions";

const apiError = (
  statusCode: number | undefined,
  message: string,
  responseBody?: string,
) =>
  new APICallError({
    message,
    url: GATEWAY_URL,
    requestBodyValues: {},
    ...(statusCode !== undefined ? { statusCode } : {}),
    ...(responseBody !== undefined ? { responseBody } : {}),
  });

const quotaError = () =>
  apiError(
    429,
    "Error 429: You have reached your weekly plan limit. Upgrade your plan.",
    '{"error":"weekly plan limit"}',
  );

// The shape the SDK throws once its retries give up.
const retryError = (errors: unknown[]) =>
  Object.assign(new Error("Failed after 3 attempts."), {
    name: "AI_RetryError",
    reason: "maxRetriesExceeded",
    errors,
    lastError: errors.at(-1),
  });

describe("classifyModelProviderError", () => {
  it("treats provider quota and rate limits as a usage limit", () => {
    expect(classifyModelProviderError(quotaError())).toBe("limit");
    expect(
      classifyModelProviderError(apiError(400, "Go usage limit exceeded")),
    ).toBe("limit");
    expect(classifyModelProviderError(apiError(402, "Payment required"))).toBe(
      "limit",
    );
  });

  it("treats 5xx, auth failures and an unreachable host as unavailable", () => {
    expect(classifyModelProviderError(apiError(503, "Bad gateway"))).toBe(
      "unavailable",
    );
    expect(classifyModelProviderError(apiError(401, "Invalid key"))).toBe(
      "unavailable",
    );
    expect(
      classifyModelProviderError(
        apiError(undefined, "Cannot connect to API: fetch failed"),
      ),
    ).toBe("unavailable");
  });

  it("looks through retry wrappers and causes", () => {
    expect(
      classifyModelProviderError(
        retryError([apiError(503, "x"), quotaError()]),
      ),
    ).toBe("limit");
    expect(
      classifyModelProviderError(
        new Error("stream failed", { cause: apiError(502, "Bad gateway") }),
      ),
    ).toBe("unavailable");
  });

  it("leaves errors that are not the provider's alone", () => {
    expect(classifyModelProviderError(apiError(400, "Invalid prompt"))).toBe(
      undefined,
    );
    expect(
      classifyModelProviderError(new Error("search_docs: rate limit exceeded")),
    ).toBe(undefined);
    expect(classifyModelProviderError(new TypeError("fetch failed"))).toBe(
      undefined,
    );
    expect(classifyModelProviderError("boom")).toBe(undefined);
    expect(classifyModelProviderError(null)).toBe(undefined);
  });
});

describe("toPublicStreamError", () => {
  beforeEach(() => resetModelProviderHealth());

  it("returns visitor copy without provider internals", () => {
    const text = toPublicStreamError(quotaError());
    expect(text).toBe(MODEL_PROVIDER_LIMIT_MESSAGE);
    expect(text).not.toMatch(/plan limit|gateway|429/i);
    expect(toPublicStreamError(apiError(500, "upstream exploded"))).toBe(
      MODEL_PROVIDER_UNAVAILABLE_MESSAGE,
    );
  });

  it("keeps the generic message for other errors and records nothing", async () => {
    expect(toPublicStreamError(new Error("tool failed"))).toBe(
      GENERIC_STREAM_ERROR_MESSAGE,
    );
    expect(await isModelProviderDegraded()).toBe(false);
  });

  it("is the error part a real stream carries when the provider is out of quota", async () => {
    const result = streamText({
      model: new MockLanguageModelV4({
        doStream: async () => {
          throw quotaError();
        },
      }),
      prompt: "hello",
      maxRetries: 0,
      onError: () => {},
    });

    const chunks: UIMessageChunk[] = [];
    for await (const chunk of result.toUIMessageStream({
      onError: toPublicStreamError,
    })) {
      chunks.push(chunk);
    }

    const errors = chunks.filter((c) => c.type === "error");
    expect(errors).toEqual([
      { type: "error", errorText: MODEL_PROVIDER_LIMIT_MESSAGE },
    ]);
    expect(JSON.stringify(chunks)).not.toContain("gateway.example.test");
  });
});

describe("model provider health", () => {
  beforeEach(() => resetModelProviderHealth());

  it("is healthy until a provider failure is recorded", async () => {
    expect(await isModelProviderDegraded(1_000)).toBe(false);
  });

  it("reports degraded within the window after a failure, then recovers", async () => {
    const at = 10_000_000;
    recordModelProviderFailure(at);
    expect(await isModelProviderDegraded(at + 1_000)).toBe(true);

    resetModelProviderHealth();
    recordModelProviderFailure(at);
    expect(
      await isModelProviderDegraded(at + MODEL_PROVIDER_FAILURE_WINDOW_MS + 1),
    ).toBe(false);
  });

  it("caches the reading for a minute", async () => {
    const at = 20_000_000;
    expect(await isModelProviderDegraded(at)).toBe(false);
    // A failure recorded elsewhere is not seen until the cache expires; one
    // recorded here clears the cache.
    recordModelProviderFailure(at + 1);
    expect(await isModelProviderDegraded(at + 2)).toBe(true);
  });
});

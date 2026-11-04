import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  set: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      set: store.set,
      get: store.get,
    }),
  },
}));

import {
  MODEL_PROVIDER_FAILURE_WINDOW_MS,
  isModelProviderDegraded,
  recordModelProviderFailure,
  resetModelProviderHealth,
} from "./model-provider-errors";

describe("model provider health shared through Redis", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    resetModelProviderHealth();
    store.values.clear();
    store.set.mockImplementation(async (key: string, value: unknown) => {
      store.values.set(key, value);
      return "OK";
    });
    store.get.mockImplementation(async (key: string) =>
      store.values.has(key) ? store.values.get(key) : null,
    );
  });
  afterEach(() => vi.unstubAllEnvs());

  it("writes one expiring marker per failure", () => {
    recordModelProviderFailure(5_000);
    expect(store.set).toHaveBeenCalledWith(expect.any(String), 5_000, {
      px: MODEL_PROVIDER_FAILURE_WINDOW_MS,
    });
  });

  it("sees a failure another instance recorded", async () => {
    const at = 50_000_000;
    store.values.set("aui:www:model-provider:last-failure", at - 1_000);
    expect(await isModelProviderDegraded(at)).toBe(true);
  });

  it("reads Redis at most once a minute", async () => {
    const at = 60_000_000;
    await isModelProviderDegraded(at);
    await isModelProviderDegraded(at + 30_000);
    expect(store.get).toHaveBeenCalledTimes(1);
    await isModelProviderDegraded(at + 61_000);
    expect(store.get).toHaveBeenCalledTimes(2);
  });

  it("stays healthy when Redis cannot be read", async () => {
    store.get.mockRejectedValue(new Error("redis down"));
    expect(await isModelProviderDegraded(70_000_000)).toBe(false);
  });

  it("does not throw when the marker cannot be written", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    store.set.mockRejectedValue(new Error("redis down"));
    expect(() => recordModelProviderFailure(80_000_000)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

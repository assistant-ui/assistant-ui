import { describe, expect, it, vi } from "vitest";
import { createCloudThreadListAdapterCreateFallback } from "./createCloudThreadListAdapterCreateFallback";

describe("createCloudThreadListAdapterCreateFallback", () => {
  it("prefers the custom create function", async () => {
    const create = vi.fn().mockResolvedValue({ externalId: "custom" });
    const initialize = vi.fn().mockResolvedValue({ externalId: "nested" });
    const fallback = createCloudThreadListAdapterCreateFallback(create, {
      source: {},
      initialize,
    });

    await expect(fallback()).resolves.toEqual({ externalId: "custom" });
    expect(initialize).not.toHaveBeenCalled();
  });

  it("initializes a sourced thread list item", async () => {
    const result = { externalId: "nested" };
    const fallback = createCloudThreadListAdapterCreateFallback(undefined, {
      source: {},
      initialize: vi.fn().mockResolvedValue(result),
    });

    await expect(fallback()).resolves.toBe(result);
  });

  it("falls back to an undefined external ID", async () => {
    const initialize = vi.fn();
    const fallback = createCloudThreadListAdapterCreateFallback(undefined, {
      source: null,
      initialize,
    });

    await expect(fallback()).resolves.toEqual({ externalId: undefined });
    expect(initialize).not.toHaveBeenCalled();
  });
});

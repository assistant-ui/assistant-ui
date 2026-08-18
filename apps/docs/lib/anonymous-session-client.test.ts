import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("ensureAnonymousSession", () => {
  it("retries after a network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { ensureAnonymousSession } =
      await import("./anonymous-session-client");

    await expect(ensureAnonymousSession()).rejects.toThrow(
      "Network unavailable",
    );
    await expect(ensureAnonymousSession()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

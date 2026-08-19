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

  it("starts a session before a public chat request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const { anonymousSessionFetch } =
      await import("./anonymous-session-client");

    const response = await anonymousSessionFetch("/api/chat", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/anonymous-session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/chat", {
      method: "POST",
    });
  });
});

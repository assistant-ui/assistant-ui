import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("anonymous session client", () => {
  it("retries bootstrap after a network failure", async () => {
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

  it("starts a browser session before a public assistant request", async () => {
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

  it("adds the signed token for supported cross-origin clients", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "signed-session" }))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const { anonymousSessionFetch } =
      await import("./anonymous-session-client");

    await anonymousSessionFetch("https://www.assistant-ui.com/api/chat", {
      method: "POST",
    });

    const requestInit = fetchMock.mock.calls[1]?.[1];
    expect(
      new Headers(requestInit?.headers).get("x-assistant-ui-anonymous-session"),
    ).toBe("signed-session");
  });
});

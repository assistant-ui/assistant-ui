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

  it("surfaces the session route's body when bootstrap is refused", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Anonymous session limit exceeded", { status: 429 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { ensureAnonymousSession } =
      await import("./anonymous-session-client");

    await expect(ensureAnonymousSession()).rejects.toThrow(
      "Anonymous session limit exceeded",
    );
  });

  it("unwraps the JSON error envelope of a refused bootstrap", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: "Anonymous sessions are issued through the website." },
          { status: 403 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { ensureAnonymousSession } =
      await import("./anonymous-session-client");

    await expect(ensureAnonymousSession()).rejects.toThrow(
      "Anonymous sessions are issued through the website.",
    );
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

  it("clones a body-bearing Request before a 401 retry", async () => {
    const bodies: string[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(async (input) => {
        bodies.push(await (input as Request).text());
        return new Response(null, { status: 401 });
      })
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(async (input) => {
        bodies.push(await (input as Request).text());
        return new Response("ok");
      });
    vi.stubGlobal("fetch", fetchMock);
    const { anonymousSessionFetch } =
      await import("./anonymous-session-client");
    const request = new Request("https://www.assistant-ui.com/api/chat", {
      method: "POST",
      body: "request body",
    });

    const response = await anonymousSessionFetch(request);

    expect(response.status).toBe(200);
    expect(bodies).toEqual(["request body", "request body"]);
  });

  it("resends a body-bearing init after a 401 retry", async () => {
    const bodies: string[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(async (input) => {
        bodies.push(await (input as Request).text());
        return new Response(null, { status: 401 });
      })
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(async (input) => {
        bodies.push(await (input as Request).text());
        return new Response("ok");
      });
    vi.stubGlobal("fetch", fetchMock);
    const { anonymousSessionFetch } =
      await import("./anonymous-session-client");

    const response = await anonymousSessionFetch(
      "https://www.assistant-ui.com/api/chat",
      { method: "POST", body: "init body" },
    );

    expect(response.status).toBe(200);
    expect(bodies).toEqual(["init body", "init body"]);
  });
});

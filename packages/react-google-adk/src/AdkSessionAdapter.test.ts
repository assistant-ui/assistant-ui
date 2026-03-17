import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdkSessionAdapter } from "./AdkSessionAdapter";

// ── Helpers ──

const mockFetch =
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

const baseOptions = {
  apiUrl: "http://localhost:8000",
  appName: "my-app",
  userId: "user-1",
};

const expectedBaseUrl =
  "http://localhost:8000/apps/my-app/users/user-1/sessions";

// ── adapter.list() ──

describe("createAdkSessionAdapter - list", () => {
  it("fetches sessions and maps them to RemoteThreadMetadata", async () => {
    const sessions = [
      { id: "s1", app_name: "my-app", user_id: "user-1" },
      { id: "s2", app_name: "my-app", user_id: "user-1" },
    ];
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(sessions), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    const result = await adapter.list();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0]![0]).toBe(expectedBaseUrl);
    expect(result.threads).toHaveLength(2);
    expect(result.threads[0]).toMatchObject({
      status: "regular",
      remoteId: "s1",
      externalId: "s1",
      title: undefined,
    });
    expect(result.threads[1]).toMatchObject({
      status: "regular",
      remoteId: "s2",
      externalId: "s2",
    });
  });

  it("returns empty array when no sessions exist", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    const result = await adapter.list();

    expect(result.threads).toHaveLength(0);
  });

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Server error", { status: 500 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.list()).rejects.toThrow(
      "Failed to list sessions: 500",
    );
  });

  it("passes custom headers", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter({
      ...baseOptions,
      headers: { Authorization: "Bearer tok" },
    });
    await adapter.list();

    const init = mockFetch.mock.calls[0]![1];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });

  it("resolves dynamic headers from a function", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter({
      ...baseOptions,
      headers: async () => ({ "X-Dynamic": "val" }),
    });
    await adapter.list();

    const init = mockFetch.mock.calls[0]![1];
    expect((init?.headers as Record<string, string>)["X-Dynamic"]).toBe("val");
  });
});

// ── adapter.initialize() ──

describe("createAdkSessionAdapter - initialize", () => {
  it("creates a new session via POST and returns remoteId/externalId", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "new-session-1" }), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    const result = await adapter.initialize("thread-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(expectedBaseUrl);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init?.body as string)).toEqual({});
    expect(result).toMatchObject({
      remoteId: "thread-1",
      externalId: "new-session-1",
    });
  });

  it("throws when POST fails", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.initialize("thread-1")).rejects.toThrow(
      "Failed to create session: 403",
    );
  });
});

// ── adapter.delete() ──

describe("createAdkSessionAdapter - delete", () => {
  it("sends DELETE to the session URL", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await adapter.delete("session-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(`${expectedBaseUrl}/session-1`);
    expect(init?.method).toBe("DELETE");
  });

  it("ignores 404 responses", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not found", { status: 404 }));

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.delete("missing-session")).resolves.toBeUndefined();
  });

  it("throws on other error responses", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Server error", { status: 500 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.delete("session-1")).rejects.toThrow(
      "Failed to delete session: 500",
    );
  });

  it("URL-encodes the remoteId", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await adapter.delete("session/with spaces");

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toBe(`${expectedBaseUrl}/session%2Fwith%20spaces`);
  });
});

// ── adapter.rename / archive / unarchive ──

describe("createAdkSessionAdapter - no-op methods", () => {
  it("rename resolves without error", async () => {
    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.rename("s1", "New Title")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("archive resolves without error", async () => {
    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.archive("s1")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("unarchive resolves without error", async () => {
    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.unarchive("s1")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── adapter.generateTitle ──

describe("createAdkSessionAdapter - generateTitle", () => {
  it("returns an empty ReadableStream", async () => {
    const { adapter } = createAdkSessionAdapter(baseOptions);
    const result = await adapter.generateTitle("s1");
    expect(result).toBeInstanceOf(ReadableStream);
  });
});

// ── adapter.fetch() ──

describe("createAdkSessionAdapter - fetch", () => {
  it("fetches a session and returns metadata", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "s1" }), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter(baseOptions);
    const result = await adapter.fetch("s1");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0]![0]).toBe(`${expectedBaseUrl}/s1`);
    expect(result).toMatchObject({
      status: "regular",
      remoteId: "s1",
      externalId: "s1",
      title: undefined,
    });
  });

  it("throws when session is not found", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not found", { status: 404 }));

    const { adapter } = createAdkSessionAdapter(baseOptions);
    await expect(adapter.fetch("missing")).rejects.toThrow(
      "Session not found: 404",
    );
  });
});

// ── load() ──

describe("createAdkSessionAdapter - load", () => {
  it("reconstructs messages from session events", async () => {
    const session = {
      id: "s1",
      events: [
        {
          id: "e1",
          author: "user",
          content: { role: "user", parts: [{ text: "Hello" }] },
        },
        {
          id: "e2",
          author: "agent",
          content: { role: "model", parts: [{ text: "Hi there!" }] },
        },
      ],
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(session), { status: 200 }),
    );

    const { load } = createAdkSessionAdapter(baseOptions);
    const result = await load("s1");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0]![0]).toBe(`${expectedBaseUrl}/s1`);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty messages when session has no events", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "s1", events: [] }), { status: 200 }),
    );

    const { load } = createAdkSessionAdapter(baseOptions);
    const result = await load("s1");

    expect(result.messages).toEqual([]);
  });

  it("returns empty messages when events field is missing", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "s1" }), { status: 200 }),
    );

    const { load } = createAdkSessionAdapter(baseOptions);
    const result = await load("s1");

    expect(result.messages).toEqual([]);
  });

  it("throws when session fetch fails", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Server error", { status: 500 }),
    );

    const { load } = createAdkSessionAdapter(baseOptions);
    await expect(load("s1")).rejects.toThrow("Failed to load session: 500");
  });

  it("URL-encodes the sessionId", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "s/1", events: [] }), { status: 200 }),
    );

    const { load } = createAdkSessionAdapter(baseOptions);
    await load("s/1");

    expect(mockFetch.mock.calls[0]![0]).toBe(`${expectedBaseUrl}/s%2F1`);
  });

  it("passes custom headers to the load request", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "s1", events: [] }), { status: 200 }),
    );

    const { load } = createAdkSessionAdapter({
      ...baseOptions,
      headers: { Authorization: "Bearer tok" },
    });
    await load("s1");

    const init = mockFetch.mock.calls[0]![1];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });
});

// ── URL encoding ──

describe("createAdkSessionAdapter - URL encoding", () => {
  it("encodes special characters in appName and userId", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { adapter } = createAdkSessionAdapter({
      apiUrl: "http://localhost:8000",
      appName: "my app/special",
      userId: "user@1",
    });
    await adapter.list();

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toBe(
      "http://localhost:8000/apps/my%20app%2Fspecial/users/user%401/sessions",
    );
  });
});

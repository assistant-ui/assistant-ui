import { describe, expect, it, vi } from "vitest";
import { createAdkApiRoute } from "./createAdkApiRoute";

describe("createAdkApiRoute", () => {
  it("creates the client thread session before the first run", async () => {
    const sessions = new Set<string>();
    const getSession = vi.fn(async ({ sessionId }: { sessionId: string }) =>
      sessions.has(sessionId) ? { id: sessionId } : undefined,
    );
    const createSession = vi.fn(
      async ({ sessionId }: { sessionId: string }) => {
        sessions.add(sessionId);
        return { id: sessionId };
      },
    );
    const runAsync = vi.fn((options: Record<string, unknown>) => {
      expect(sessions.has(options.sessionId as string)).toBe(true);
      return (async function* () {})();
    });
    const sessionId = vi.fn(
      (_request: Request, clientSessionId: string | undefined) => {
        if (!clientSessionId) throw new Error("Missing session ID");
        return `scoped-${clientSessionId}`;
      },
    );
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: "user-1",
      sessionId,
    });

    await handler(
      new Request("https://example.test/api/adk", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", sessionId: "thread-1" }),
      }),
    );

    expect(sessionId).toHaveBeenCalledWith(expect.any(Request), "thread-1");
    expect(createSession).toHaveBeenCalledWith({
      appName: "test-app",
      userId: "user-1",
      sessionId: "scoped-thread-1",
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sessionId: "scoped-thread-1",
      }),
    );
  });

  it("uses a separate session for each thread of the same user", async () => {
    const getSession = vi.fn(async () => undefined);
    const createSession = vi.fn(
      async ({ sessionId }: { sessionId: string }) => ({
        id: sessionId,
      }),
    );
    const runAsync = vi.fn(async function* (
      _options: Record<string, unknown>,
    ) {});
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: "user-1",
      sessionId: (_request, clientSessionId) => {
        if (!clientSessionId) throw new Error("Missing session ID");
        return clientSessionId;
      },
    });

    for (const threadId of ["thread-1", "thread-2"]) {
      await handler(
        new Request("https://example.test/api/adk", {
          method: "POST",
          body: JSON.stringify({ message: "Hello", sessionId: threadId }),
        }),
      );
    }

    expect(getSession).toHaveBeenCalledTimes(2);
    expect(getSession).toHaveBeenNthCalledWith(1, {
      appName: "test-app",
      userId: "user-1",
      sessionId: "thread-1",
    });
    expect(getSession).toHaveBeenNthCalledWith(2, {
      appName: "test-app",
      userId: "user-1",
      sessionId: "thread-2",
    });
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession).toHaveBeenNthCalledWith(1, {
      appName: "test-app",
      userId: "user-1",
      sessionId: "thread-1",
    });
    expect(createSession).toHaveBeenNthCalledWith(2, {
      appName: "test-app",
      userId: "user-1",
      sessionId: "thread-2",
    });
    expect(runAsync).toHaveBeenCalledTimes(2);
    expect(runAsync.mock.calls[0]?.[0]).toMatchObject({
      userId: "user-1",
      sessionId: "thread-1",
    });
    expect(runAsync.mock.calls[1]?.[0]).toMatchObject({
      userId: "user-1",
      sessionId: "thread-2",
    });
  });

  it("resolves a supplied session ID only within the authenticated user", async () => {
    const getSession = vi.fn(async ({ userId }: { userId: string }) =>
      userId === "user-a" ? { id: "user-a-session" } : undefined,
    );
    const createSession = vi.fn(
      async ({ sessionId }: { sessionId: string }) => ({
        id: sessionId,
      }),
    );
    const runAsync = vi.fn(async function* () {});
    const authenticatedUsers = new WeakMap<Request, string>();
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: (request) => {
        const userId = authenticatedUsers.get(request);
        if (!userId) throw new Error("Unauthenticated");
        return userId;
      },
      sessionId: (_request, clientSessionId) => {
        if (!clientSessionId) throw new Error("Missing session ID");
        return clientSessionId;
      },
    });
    const request = new Request("https://example.test/api/adk", {
      method: "POST",
      body: JSON.stringify({ message: "Hello", sessionId: "user-a-session" }),
    });
    authenticatedUsers.set(request, "user-b");

    await handler(request);

    expect(getSession).toHaveBeenCalledExactlyOnceWith({
      appName: "test-app",
      userId: "user-b",
      sessionId: "user-a-session",
    });
    expect(createSession).toHaveBeenCalledExactlyOnceWith({
      appName: "test-app",
      userId: "user-b",
      sessionId: "user-a-session",
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-b",
        sessionId: "user-a-session",
      }),
    );
  });

  it("shares session creation across concurrent first requests", async () => {
    const getSession = vi.fn(async () => undefined);
    let releaseCreation!: () => void;
    let markCreationStarted!: () => void;
    const creationStarted = new Promise<void>((resolve) => {
      markCreationStarted = resolve;
    });
    const createSession = vi.fn(async () => {
      markCreationStarted();
      await new Promise<void>((resolve) => {
        releaseCreation = resolve;
      });
      return { id: "thread-1" };
    });
    const runAsync = vi.fn(async function* () {});
    const sessionId = vi.fn(
      (_request: Request, clientSessionId: string | undefined) =>
        clientSessionId ?? "missing",
    );
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: "user-1",
      sessionId,
    });
    const makeRequest = () =>
      new Request("https://example.test/api/adk", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", sessionId: "thread-1" }),
      });

    const firstRequest = handler(makeRequest());
    await creationStarted;
    const secondRequest = handler(makeRequest());
    await vi.waitFor(() => expect(sessionId).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    releaseCreation();
    await Promise.all([firstRequest, secondRequest]);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledTimes(2);
  });

  it("continues when another process creates the session first", async () => {
    let exists = false;
    const getSession = vi.fn(async () =>
      exists ? { id: "thread-1" } : undefined,
    );
    const createSession = vi.fn(async () => {
      exists = true;
      throw new Error("Session already exists");
    });
    const runAsync = vi.fn(async function* () {});
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: "user-1",
      sessionId: "thread-1",
    });

    await handler(
      new Request("https://example.test/api/adk", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      }),
    );

    expect(getSession).toHaveBeenCalledTimes(2);
    expect(createSession).toHaveBeenCalledOnce();
    expect(runAsync).toHaveBeenCalledOnce();
  });

  it("preserves create failures when the session still does not exist", async () => {
    const failure = new Error("database unavailable");
    const getSession = vi.fn(async () => undefined);
    const createSession = vi.fn(async () => {
      throw failure;
    });
    const runAsync = vi.fn(async function* () {});
    const handler = createAdkApiRoute({
      runner: {
        appName: "test-app",
        sessionService: { getSession, createSession },
        runAsync,
      },
      userId: "user-1",
      sessionId: "thread-1",
    });

    await expect(
      handler(
        new Request("https://example.test/api/adk", {
          method: "POST",
          body: JSON.stringify({ message: "Hello" }),
        }),
      ),
    ).rejects.toBe(failure);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(runAsync).not.toHaveBeenCalled();
  });
});

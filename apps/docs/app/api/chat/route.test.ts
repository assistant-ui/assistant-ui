import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  resolveChatModel: vi.fn(),
  docsToolkit: {},
  resolveDemoIdentity: vi.fn(),
  claimConversation: vi.fn(),
  streamDocsChat: vi.fn(),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkPublicAssistantRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveChatModel: mocks.resolveChatModel,
}));

// @/lib/docs-toolkit's UI component graph does not resolve in the test
// environment, so this mock fully replaces the module (its only export)
// instead of spreading importOriginal().
vi.mock("@/lib/docs-toolkit", () => ({ default: mocks.docsToolkit }));

// demo-usage reaches the accounts session and Upstash behind a server-only
// guard, so this mock replaces the module rather than spreading it.
vi.mock("@/lib/demo-usage", () => ({
  resolveDemoIdentity: mocks.resolveDemoIdentity,
  claimConversation: mocks.claimConversation,
}));

// The model call is replaced so a test can read the system prompt and tools
// the route hands it.
vi.mock("@/lib/ai/chat-route", async (importOriginal) => ({
  ...(await importOriginal()),
  streamDocsChat: mocks.streamDocsChat,
}));

import { POST } from "./route";

describe("POST /api/chat access boundary", () => {
  it("rejects a direct request before model selection", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("stops before model selection when a generous quota is exhausted", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(429);
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("rejects oversized frontend tools before model selection", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: "user-message",
              role: "user",
              parts: [{ type: "text", text: "Search the docs" }],
            },
          ],
          tools: {
            search: {
              description: "x".repeat(96_000),
              parameters: { type: "object", properties: {} },
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Tools too large");
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("rejects malformed frontend tools before model selection", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: "user-message",
              role: "user",
              parts: [{ type: "text", text: "Search the docs" }],
            },
          ],
          tools: "search",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid tools format");
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });
});

// The claim sits after model resolution and the reserved-tool check, so the
// request has to survive that far to reach it.
const allowed = () => {
  mocks.requireSession.mockReturnValue({
    id: "session_1234567890",
    expiresAt: Date.now() + 60_000,
  });
  mocks.checkRateLimit.mockResolvedValue(null);
  mocks.resolveChatModel.mockReturnValue({
    model: {},
    providerOptions: {},
    reasoning: undefined,
  });
};

// A valid message, because the claim now sits after input validation and a
// rejected request must not spend a slot.
const message = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "hello" }],
};

const send = (body: Record<string, unknown>) =>
  POST(
    new Request("https://www.assistant-ui.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/chat conversation budget", () => {
  it("does not spend a slot on a request the route rejects", async () => {
    allowed();

    const response = await send({
      messages: [],
      id: "thread_1",
      countConversations: true,
    });

    expect(response.status).toBe(400);
    expect(mocks.claimConversation).not.toHaveBeenCalled();
  });

  it("leaves every surface that does not opt in out of the budget", async () => {
    allowed();

    await send({ messages: [message], id: "thread_1" }).catch(() => null);

    expect(mocks.claimConversation).not.toHaveBeenCalled();
  });

  it("claims the thread under the visitor's identity when it opts in", async () => {
    allowed();
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: true,
      usage: { used: 1, limit: 3, remaining: 2, resetAt: Date.now() + 60_000 },
    });

    await send({
      messages: [message],
      id: "thread_1",
      countConversations: true,
    }).catch(() => null);

    expect(mocks.resolveDemoIdentity).toHaveBeenCalledWith(
      "session_1234567890",
    );
    expect(mocks.claimConversation).toHaveBeenCalledWith(
      { identity: "anon:session_1234567890", signedIn: false, limit: 3 },
      "thread_1",
    );
  });

  it("refuses a new conversation once the day is spent", async () => {
    allowed();
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: false,
      usage: { used: 3, limit: 3, remaining: 0, resetAt: Date.now() + 60_000 },
    });

    const response = await send({
      messages: [message],
      id: "thread_4",
      countConversations: true,
    });

    expect(response.status).toBe(429);
    expect(await response.text()).toBe("Daily conversation limit reached");
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("POST /api/chat generative UI", () => {
  const streamed = () =>
    mocks.streamDocsChat.mockReturnValue({
      result: {
        toUIMessageStream: () =>
          new ReadableStream({ start: (controller) => controller.close() }),
      },
      messageMetadata: () => undefined,
    });
  const claimAllowed = () => {
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: true,
      usage: { used: 1, limit: 3, remaining: 2, resetAt: Date.now() + 60_000 },
    });
  };
  const modelOptions = (call: number) =>
    mocks.streamDocsChat.mock.calls[call]![3] as {
      system?: string;
      tools: Record<string, unknown>;
    };

  it("gives image search only to a client that renders specs", async () => {
    allowed();
    streamed();
    const renderSpec = {
      description: "Shows a spec.",
      parameters: { type: "object", properties: {} },
    };

    await (
      await send({ messages: [message], tools: { render_spec: renderSpec } })
    ).text();
    await (await send({ messages: [message] })).text();

    expect(modelOptions(0).tools).toHaveProperty("search_images");
    expect(modelOptions(1).tools).not.toHaveProperty("search_images");
  });

  it("keeps a longer system prompt only on the landing page demo", async () => {
    allowed();
    streamed();
    claimAllowed();
    const system = "x".repeat(10_000);

    await (
      await send({
        messages: [message],
        system,
        id: "thread_1",
        countConversations: true,
      })
    ).text();
    await (await send({ messages: [message], system })).text();

    expect(modelOptions(0).system).toBe(system);
    expect(modelOptions(1)).not.toHaveProperty("system");
  });

  it("accepts an answer sized message only on the landing page demo", async () => {
    allowed();
    streamed();
    claimAllowed();
    const long = {
      ...message,
      parts: [{ type: "text", text: "x".repeat(20_000) }],
    };

    const demo = await send({
      messages: [long],
      id: "thread_1",
      countConversations: true,
    });
    const docs = await send({ messages: [long] });

    expect(demo.status).toBe(200);
    expect(docs.status).toBe(400);
    expect(await docs.text()).toBe("Single message too long");
  });
});

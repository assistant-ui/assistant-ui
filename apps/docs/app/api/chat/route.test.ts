import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  resolveChatModel: vi.fn(),
  docsToolkit: {},
  resolveDemoIdentity: vi.fn(),
  claimConversation: vi.fn(),
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

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

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
});

describe("POST /api/chat conversation budget", () => {
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

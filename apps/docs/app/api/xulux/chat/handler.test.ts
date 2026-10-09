import { describe, expect, it, vi } from "vitest";
import { XULUX_MODEL_ID } from "@/lib/xulux/usage-budget-codes";
import type { XuluxAgentDefinition } from "./agents";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getDistinctId: vi.fn(() => "analytics-distinct-id"),
  beginTurn: vi.fn(),
  finishTurn: vi.fn(),
  resolveChatModel: vi.fn(() => ({
    model: {},
    providerOptions: undefined,
    reasoning: false,
  })),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn<
    (messages: unknown, options?: { tools?: unknown }) => unknown
  >((messages) => messages),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkPublicAssistantRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal()),
  getDistinctId: mocks.getDistinctId,
}));

vi.mock("@/lib/xulux/usage-budget", async (importOriginal) => ({
  ...(await importOriginal()),
  beginTurn: mocks.beginTurn,
  finishTurn: mocks.finishTurn,
}));

vi.mock("@/lib/prism-server", async (importOriginal) => ({
  ...(await importOriginal()),
  createPrismTracer: () => null,
}));

vi.mock("@/lib/ai/telemetry", async (importOriginal) => ({
  ...(await importOriginal()),
  posthogTelemetry: () => ({}),
}));

vi.mock("@/lib/validate-input", async (importOriginal) => ({
  ...(await importOriginal()),
  validateDocChatInput: () => null,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveChatModel: mocks.resolveChatModel,
}));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => ({
  ...(await importOriginal()),
  injectQuoteContext: (messages: unknown) => messages,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  convertToModelMessages: mocks.convertToModelMessages,
  pruneMessages: ({ messages }: { messages: unknown }) => messages,
  stepCountIs: () => () => false,
  streamText: mocks.streamText,
}));

import { createXuluxChatHandler } from "./handler";

const agent: XuluxAgentDefinition = {
  systemPrompt: "Test system prompt",
  maxSteps: 2,
  prepareTools: () => ({}),
};

const request = (
  config?: Record<string, unknown>,
  overrides?: Record<string, unknown>,
) =>
  new Request("https://www.assistant-ui.com/api/xulux/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "xulux-chat-session",
      ...(config ? { config } : {}),
      messages: [
        {
          id: "user-message",
          role: "user",
          parts: [{ type: "text", text: "Build a weather app" }],
        },
      ],
      ...overrides,
    }),
  });

describe("createXuluxChatHandler access boundary", () => {
  it("rejects requests without a valid public assistant session", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await createXuluxChatHandler(agent)(request());

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.beginTurn).not.toHaveBeenCalled();
  });

  it("checks the layered rate limit with the signed session", async () => {
    const publicSession = {
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    };
    mocks.requireSession.mockReturnValue(publicSession);
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await createXuluxChatHandler(agent)(request());

    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      publicSession.id,
    );
    expect(mocks.beginTurn).not.toHaveBeenCalled();
  });

  it("rejects oversized frontend tools before starting a metered turn", async () => {
    mocks.requireSession.mockReturnValue({
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await createXuluxChatHandler(agent)(
      request(undefined, {
        tools: {
          update: {
            description: "x".repeat(96_000),
            parameters: { type: "object", properties: {} },
          },
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Tools too large");
    expect(mocks.beginTurn).not.toHaveBeenCalled();
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("binds usage accounting to the signed session identity", async () => {
    const publicSession = {
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    };
    mocks.requireSession.mockReturnValue(publicSession);
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.beginTurn.mockResolvedValue({
      denied: null,
      budgetDate: "2026-08-27",
    });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });

    const response = await createXuluxChatHandler(agent)(request());

    expect(response.status).toBe(200);
    expect(mocks.beginTurn).toHaveBeenCalledWith(
      `${publicSession.id}:xulux-chat-session`,
      publicSession.id,
    );
    expect(mocks.beginTurn).not.toHaveBeenCalledWith(
      "xulux-chat-session",
      "analytics-distinct-id",
    );

    const usage = { inputTokens: 10, outputTokens: 5, totalTokens: 15 };
    const options = mocks.streamText.mock.calls[0]?.[0] as {
      onFinish: (result: { usage: typeof usage }) => Promise<void>;
    };
    await options.onFinish({ usage });

    expect(mocks.finishTurn).toHaveBeenCalledWith(
      `${publicSession.id}:xulux-chat-session`,
      publicSession.id,
      usage,
      "2026-08-27",
    );
  });

  it("forwards the request abort signal to streamText", async () => {
    mocks.requireSession.mockReturnValue({
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.beginTurn.mockResolvedValue({
      denied: null,
      budgetDate: "2026-08-27",
    });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });

    const req = request();
    const response = await createXuluxChatHandler(agent)(req);

    expect(response.status).toBe(200);
    expect(mocks.streamText.mock.calls[0]?.[0].abortSignal).toBe(req.signal);
  });

  it("converts messages with the tool set it streams with", async () => {
    mocks.requireSession.mockReturnValue({
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.beginTurn.mockResolvedValue({
      denied: null,
      budgetDate: "2026-08-27",
    });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });
    const tools = {};

    await createXuluxChatHandler({ ...agent, prepareTools: () => tools })(
      request(),
    );

    expect(mocks.convertToModelMessages.mock.calls[0]?.[1]?.tools).toBe(tools);
    expect(mocks.streamText.mock.calls[0]?.[0].tools).toBe(tools);
  });

  it("hands the agent an empty tool map when the request sends none", async () => {
    mocks.requireSession.mockReturnValue({
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.beginTurn.mockResolvedValue({
      denied: null,
      budgetDate: "2026-08-27",
    });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });
    const prepareTools = vi.fn(() => ({}));

    const response = await createXuluxChatHandler({ ...agent, prepareTools })(
      request(),
    );

    expect(response.status).toBe(200);
    expect(prepareTools).toHaveBeenCalledWith(
      expect.objectContaining({ clientTools: {} }),
    );
  });

  it("runs the metered model whatever model the request names", async () => {
    mocks.requireSession.mockReturnValue({
      id: "signed-session-1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.beginTurn.mockResolvedValue({
      denied: null,
      budgetDate: "2026-08-27",
    });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok"),
    });

    const response = await createXuluxChatHandler(agent)(
      request({ modelName: "grok/grok-4.3", reasoningEffort: "medium" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.resolveChatModel).toHaveBeenLastCalledWith({
      modelName: XULUX_MODEL_ID,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { XuluxAgentDefinition } from "./agents";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getDistinctId: vi.fn(() => "analytics-distinct-id"),
  beginTurn: vi.fn(),
  finishTurn: vi.fn(),
  streamText: vi.fn(),
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
  resolveChatModel: () => ({
    model: {},
    providerOptions: undefined,
    reasoning: false,
  }),
}));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => ({
  ...(await importOriginal()),
  injectQuoteContext: (messages: unknown) => messages,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  convertToModelMessages: (messages: unknown) => messages,
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

const request = () =>
  new Request("https://www.assistant-ui.com/api/xulux/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "xulux-chat-session",
      messages: [
        {
          id: "user-message",
          role: "user",
          parts: [{ type: "text", text: "Build a weather app" }],
        },
      ],
    }),
  });

afterEach(() => {
  vi.clearAllMocks();
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
      onFinish: (result: {
        usage: typeof usage;
        response: { modelId: string };
      }) => Promise<void>;
    };
    await options.onFinish({ usage, response: { modelId: "test-model" } });

    expect(mocks.finishTurn).toHaveBeenCalledWith(
      `${publicSession.id}:xulux-chat-session`,
      publicSession.id,
      usage,
      "test-model",
      "2026-08-27",
    );
  });
});

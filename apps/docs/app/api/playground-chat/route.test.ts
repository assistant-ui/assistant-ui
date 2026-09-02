import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getModel: vi.fn(),
  getDistinctId: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: mocks.getModel,
}));

vi.mock("@/lib/validate-input", async (importOriginal) => ({
  ...(await importOriginal()),
  validateGeneralChatInput: () => null,
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal()),
  getDistinctId: mocks.getDistinctId,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  convertToModelMessages: (messages: unknown) => messages,
  pruneMessages: ({ messages }: { messages: unknown }) => messages,
  stepCountIs: () => () => false,
  streamText: mocks.streamText,
}));

import { POST } from "./route";

const request = () =>
  new Request("https://www.assistant-ui.com/api/playground-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", parts: [{ type: "text", text: "make it red" }] },
      ],
      tools: {},
      builderConfig: {},
    }),
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/playground-chat telemetry", () => {
  it("reports under its own capability so it separates from the other chat routes", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.getModel.mockReturnValue({});
    mocks.getDistinctId.mockReturnValue("distinct_1234567890");
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    const options = mocks.streamText.mock.calls[0]?.[0];
    expect(options.telemetry.functionId).toBe("playground_chat");
    expect(options.runtimeContext.$ai_span_name).toBe("playground_chat");
    expect(options.runtimeContext.posthog_distinct_id).toBe(
      "distinct_1234567890",
    );
  });

  it("does not reach the model when the rate limit answers", async () => {
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});

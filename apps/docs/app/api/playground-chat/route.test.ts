import { describe, expect, it, vi } from "vitest";
import { updateConfigSchema } from "@/lib/playground-config-schema";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  resolveChatModel: vi.fn(),
  getDistinctId: vi.fn(),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn<
    (messages: unknown, options?: { tools?: unknown }) => unknown
  >((messages) => messages),
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
  resolveChatModel: mocks.resolveChatModel,
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
  convertToModelMessages: mocks.convertToModelMessages,
  pruneMessages: ({ messages }: { messages: unknown }) => messages,
  stepCountIs: () => () => false,
  streamText: mocks.streamText,
}));

import { POST } from "./route";

const request = (overrides?: Record<string, unknown>) =>
  new Request("https://www.assistant-ui.com/api/playground-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", parts: [{ type: "text", text: "make it red" }] },
      ],
      tools: {},
      builderConfig: {},
      ...overrides,
    }),
  });

describe("POST /api/playground-chat telemetry", () => {
  it("lists exactly the config schema fields in the system prompt", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveChatModel.mockReturnValue({ model: {} });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    });

    await POST(request());

    const system = mocks.streamText.mock.calls[0]?.[0].system as string;
    const fieldsIn = (section: string) => {
      const body = system.split(`### ${section}\n`)[1]?.split("\n\n")[0];
      return Array.from(
        body?.matchAll(/^- ([\w.]+) \(/gm) ?? [],
        ([, field]) => field,
      );
    };
    const components = updateConfigSchema.shape.components.unwrap().shape;
    const styles = updateConfigSchema.shape.styles.unwrap().shape;
    const expectedComponents = Object.keys(components).flatMap((key) =>
      key === "actionBar"
        ? Object.keys(components.actionBar.unwrap().shape).map(
            (child) => `${key}.${child}`,
          )
        : [key],
    );
    const expectedStyles = Object.keys(styles).flatMap((key) =>
      key === "colors"
        ? Object.keys(styles.colors.unwrap().shape).map(
            (child) => `${key}.${child}`,
          )
        : [key],
    );

    expect(fieldsIn("components")).toEqual(expectedComponents);
    expect(fieldsIn("styles")).toEqual(expectedStyles);
    expect(system).toContain(
      `### ${Object.keys(updateConfigSchema.shape)[2]} (string, optional)`,
    );
  });

  it("reports under its own capability so it separates from the other chat routes", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveChatModel.mockReturnValue({ model: {} });
    mocks.getDistinctId.mockReturnValue("distinct_1234567890");
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    });

    const req = request();
    const response = await POST(req);

    expect(response.status).toBe(200);
    const options = mocks.streamText.mock.calls[0]?.[0];
    expect(options.abortSignal).toBe(req.signal);
    expect(options.telemetry.functionId).toBe("playground_chat");
    expect(options.runtimeContext.$ai_span_name).toBe("playground_chat");
    expect(options.runtimeContext.posthog_distinct_id).toBe(
      "distinct_1234567890",
    );
  });

  it("converts messages with the tool set it streams with", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveChatModel.mockReturnValue({ model: {} });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    });

    await POST(
      request({
        tools: {
          update_config: {
            description: "Update the builder config",
            parameters: { type: "object", properties: {} },
          },
        },
      }),
    );

    const tools = mocks.streamText.mock.calls[0]?.[0].tools;
    expect(Object.keys(tools)).toEqual(["update_config"]);
    expect(mocks.convertToModelMessages.mock.calls[0]?.[1]?.tools).toBe(tools);
  });

  it("streams a request that sends no tools", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.resolveChatModel.mockReturnValue({ model: {} });
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    });

    const response = await POST(request({ tools: undefined }));

    expect(response.status).toBe(200);
    expect(mocks.streamText.mock.calls[0]?.[0].tools).toEqual({});
  });

  it("does not reach the model when the rate limit answers", async () => {
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("rejects oversized frontend tools before model selection", async () => {
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      request({
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
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});

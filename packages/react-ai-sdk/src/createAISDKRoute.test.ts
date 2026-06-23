import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAISDKRoute } from "./createAISDKRoute";

const mocks = vi.hoisted(() => ({
  convertToModelMessages: vi.fn(),
  jsonSchema: vi.fn((schema) => ({ kind: "jsonSchema", schema })),
  streamText: vi.fn(),
  toUIMessageStreamResponse: vi.fn(),
}));

vi.mock("ai", () => ({
  convertToModelMessages: mocks.convertToModelMessages,
  jsonSchema: mocks.jsonSchema,
  streamText: mocks.streamText,
}));

const mockResult = () => ({
  toUIMessageStreamResponse: mocks.toUIMessageStreamResponse,
});

const request = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("createAISDKRoute", () => {
  beforeEach(() => {
    mocks.convertToModelMessages.mockReset();
    mocks.convertToModelMessages.mockResolvedValue([
      { role: "user", content: "hello" },
    ]);
    mocks.jsonSchema.mockClear();
    mocks.streamText.mockReset();
    mocks.streamText.mockReturnValue(mockResult());
    mocks.toUIMessageStreamResponse.mockReset();
    mocks.toUIMessageStreamResponse.mockReturnValue(new Response("ok"));
  });

  it("creates a POST handler with the default assistant-ui AI SDK wiring", async () => {
    const messages = [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
    ];
    const { POST } = createAISDKRoute({
      toolkit: {
        serverTool: {
          type: "backend",
          description: "Server tool",
          parameters: { type: "object", properties: {} },
          execute: async () => "ok",
        } as never,
      },
      model: "openai/gpt-5.4-nano",
    });

    const response = await POST(
      request({
        messages,
        system: "Be concise.",
        callSettings: { maxTokens: 123, temperature: 0.2 },
        tools: {
          clientTool: {
            description: "Client tool",
            parameters: { type: "object", properties: {} },
          },
        },
      }),
    );

    expect(await response.text()).toBe("ok");
    const aiSDKTools = expect.objectContaining({
      clientTool: expect.any(Object),
      serverTool: expect.any(Object),
    });
    expect(mocks.convertToModelMessages).toHaveBeenCalledWith(messages, {
      tools: aiSDKTools,
    });
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5.4-nano",
        system: "Be concise.",
        messages: [{ role: "user", content: "hello" }],
        maxOutputTokens: 123,
        temperature: 0.2,
        tools: aiSDKTools,
      }),
    );

    const streamOptions = mocks.streamText.mock.calls[0]![0];
    expect(streamOptions.tools.serverTool.execute).toBeTypeOf("function");
    expect(mocks.toUIMessageStreamResponse).toHaveBeenCalledWith(undefined);
  });

  it("allows context, dynamic model, tool filtering, and final streamText overrides", async () => {
    const prepareStreamText = vi.fn(({ defaults }) => ({
      ...defaults,
      headers: { "x-tenant": "tenant-1" },
      system: "Prepared system",
    }));
    const { POST } = createAISDKRoute({
      toolkit: {},
      context: async () => ({ tenantId: "tenant-1" }),
      model: ({ body }) => (body.config as { modelName: string }).modelName,
      system: ({ ctx }) => `Tenant ${ctx.tenantId}`,
      tools: async ({ defaultTools }) => ({
        ...defaultTools,
        tenant_lookup: { inputSchema: { type: "object" } } as never,
      }),
      streamText: ({ ctx }) => ({
        maxOutputTokens: 7,
        providerOptions: { openai: { tenantId: ctx.tenantId } },
      }),
      prepareStreamText,
    });

    await POST(
      request({
        messages: [],
        config: { modelName: "openai/gpt-5.4-mini" },
      }),
    );

    expect(prepareStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "Tenant tenant-1",
        defaults: expect.objectContaining({
          model: "openai/gpt-5.4-mini",
          maxOutputTokens: 7,
          providerOptions: { openai: { tenantId: "tenant-1" } },
          tools: expect.objectContaining({
            tenant_lookup: expect.any(Object),
          }),
        }),
      }),
    );
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "x-tenant": "tenant-1" },
        system: "Prepared system",
      }),
    );
  });

  it("passes response options to toUIMessageStreamResponse", async () => {
    const responseOptions = {
      status: 202,
      headers: { "x-route": "assistant" },
    };
    const { POST } = createAISDKRoute({
      toolkit: {},
      model: "openai/gpt-5.4-nano",
      response: responseOptions,
    });

    await POST(request({ messages: [] }));

    expect(mocks.toUIMessageStreamResponse).toHaveBeenCalledWith(
      responseOptions,
    );
  });

  it("lets toResponse replace the default response", async () => {
    const customResponse = new Response("custom", { status: 203 });
    const toResponse = vi.fn(() => customResponse);
    const { POST } = createAISDKRoute({
      toolkit: {},
      model: "openai/gpt-5.4-nano",
      response: { headers: { "x-default": "yes" } },
      toResponse,
    });

    const response = await POST(request({ messages: [] }));

    expect(response).toBe(customResponse);
    expect(toResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        responseOptions: { headers: { "x-default": "yes" } },
        result: mockResult(),
      }),
    );
    expect(mocks.toUIMessageStreamResponse).not.toHaveBeenCalled();
  });

  it("returns thrown Responses for auth-style early exits", async () => {
    const { POST } = createAISDKRoute({
      toolkit: {},
      model: "openai/gpt-5.4-nano",
      context: async () => {
        throw new Response("Unauthorized", { status: 401 });
      },
    });

    const response = await POST(request({ messages: [] }));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("delegates non-Response failures to onError", async () => {
    const errorResponse = new Response("handled", { status: 500 });
    const onError = vi.fn(() => errorResponse);
    const { POST } = createAISDKRoute({
      toolkit: {},
      model: () => {
        throw new Error("boom");
      },
      onError,
    });

    const response = await POST(request({ messages: [] }));

    expect(response).toBe(errorResponse);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        body: { messages: [] },
      }),
    );
  });
});

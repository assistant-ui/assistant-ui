import { describe, expect, it, vi } from "vitest";
import type { ModelMessage, UIMessage } from "ai";

const mocks = vi.hoisted(() => ({
  convertToModelMessages: vi.fn((messages: unknown) => messages),
  pruneMessages: vi.fn(({ messages }: { messages: unknown }) => messages),
  streamText: vi.fn(),
  getDistinctId: vi.fn(() => "distinct-id"),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  convertToModelMessages: mocks.convertToModelMessages,
  pruneMessages: mocks.pruneMessages,
  streamText: mocks.streamText,
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal()),
  getDistinctId: mocks.getDistinctId,
}));

import {
  prepareChatMessages,
  prepareDocChatMessages,
  streamDocsChat,
} from "./chat-route";

const messages: UIMessage[] = [
  { id: "user-1", role: "user", parts: [{ type: "text", text: "hello" }] },
];

describe("chat route plumbing", () => {
  it("converts with the route's tools and removes reasoning", async () => {
    const tools = {};

    await prepareChatMessages(messages, tools);

    expect(mocks.convertToModelMessages).toHaveBeenCalledWith(messages, {
      tools,
    });
    expect(mocks.pruneMessages).toHaveBeenCalledWith({
      messages,
      reasoning: "none",
    });
  });

  it("forwards quoted messages through conversion and docs pruning", async () => {
    const tools = {};
    const message: UIMessage = {
      id: "quoted-message",
      role: "user",
      parts: [{ type: "text", text: "hello" }],
      metadata: { custom: { quote: { text: "quoted" } } },
    };
    const pruned: ModelMessage[] = [
      { role: "user", content: "> quoted\n\nhello" },
    ];
    const converted: ModelMessage[] = [
      { role: "assistant", content: "" },
      ...pruned,
    ];
    mocks.convertToModelMessages.mockReturnValueOnce(
      Promise.resolve(converted),
    );
    mocks.pruneMessages.mockReturnValueOnce(pruned);

    const result = await prepareDocChatMessages([message], tools);

    expect(mocks.convertToModelMessages).toHaveBeenCalledWith(
      [
        {
          ...message,
          parts: [{ type: "text", text: "> quoted\n\n" }, ...message.parts],
        },
      ],
      { tools },
    );
    expect(mocks.pruneMessages).toHaveBeenCalledWith({
      messages: converted,
      toolCalls: "before-last-2-messages",
      reasoning: "none",
      emptyMessages: "remove",
    });
    expect(result).toEqual(pruned);
  });

  it("binds cancellation, telemetry, provider options, and finish metadata", () => {
    const req = new Request("https://www.assistant-ui.com/api/chat");
    const model = {} as never;
    const { messageMetadata } = streamDocsChat(
      req,
      {
        model,
        providerOptions: {
          openai: {
            reasoningEffort: "low",
            reasoningSummary: null,
            store: false,
          },
        },
        reasoning: false,
      },
      { spanName: "general_chat", source: "general_chat" },
      { messages: [] },
    );

    const options = mocks.streamText.mock.calls[0]?.[0];
    expect(options.abortSignal).toBe(req.signal);
    expect(options.model).toBe(model);
    expect(options.providerOptions.openai.reasoningEffort).toBe("low");
    expect(options.telemetry.functionId).toBe("general_chat");
    expect(options.runtimeContext.posthog_distinct_id).toBe("distinct-id");
    expect(options.runtimeContext.posthog_source).toBe("general_chat");
    const error = new Error("model failed");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    options.onError({ error });
    expect(log).toHaveBeenCalledWith(error);
    log.mockRestore();
    expect(
      messageMetadata({
        part: {
          type: "finish-step",
          response: { modelId: "model-1" },
        } as never,
      }),
    ).toEqual({ modelId: "model-1" });
    const usage = { inputTokens: 2, outputTokens: 3 };
    expect(
      messageMetadata({
        part: { type: "finish", totalUsage: usage } as never,
      }),
    ).toEqual({ usage });
    expect(
      messageMetadata({ part: { type: "text-delta" } as never }),
    ).toBeUndefined();
  });
});

// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it, vi } from "vitest";
import { useAISDKRuntime } from "./useAISDKRuntime";

const streamOf = (chunks: UIMessageChunk[]) =>
  new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const toolCallStep = (extra: Record<string, unknown>): UIMessageChunk[] => [
  { type: "start", messageId: "assistant-1" },
  { type: "start-step" },
  {
    type: "tool-input-available",
    toolCallId: "tool-1",
    toolName: "web_search",
    input: { query: "weather" },
    ...extra,
  } as UIMessageChunk,
  { type: "finish-step" },
  { type: "finish" },
];

const setup = async (request: UIMessageChunk[]) => {
  let requests = 0;
  const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
    async () => {
      requests += 1;
      return requests === 1
        ? streamOf(request)
        : streamOf([{ type: "start" }, { type: "finish" }]);
    },
  );
  const execute = vi.fn(async () => ({ from: "frontend" }));
  const { result } = renderHook(() => {
    const chat = useChat({
      id: "chat-1",
      transport: { sendMessages, reconnectToStream: async () => null },
    });
    return { chat, runtime: useAISDKRuntime(chat) };
  });
  result.current.runtime.registerModelContextProvider({
    getModelContext: () => ({
      tools: {
        web_search: {
          parameters: { type: "object", properties: {} },
          execute,
        },
      },
    }),
  });

  await act(() => result.current.chat.sendMessage({ text: "search" }));
  await waitFor(() => expect(result.current.chat.status).toBe("ready"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    execute,
    part: () =>
      result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1")
        .getState(),
    toolPart: () =>
      result.current.chat.messages
        .flatMap((message) => message.parts)
        .find(
          (candidate) =>
            "toolCallId" in candidate && candidate.toolCallId === "tool-1",
        ),
  };
};

describe("useAISDKRuntime backend-owned tool calls", () => {
  it("leaves a provider-executed call without a result to the server", async () => {
    const { execute, part, toolPart } = await setup(
      toolCallStep({ providerExecuted: true }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(part()).toMatchObject({ providerExecuted: true });
    expect(toolPart()).toMatchObject({ state: "input-available" });
  });

  it.each([
    { name: "static", extra: {} },
    { name: "dynamic", extra: { dynamic: true } },
  ])(
    "still runs a frontend tool for a $name call the server hands to the client",
    async ({ extra }) => {
      const { execute, part } = await setup(toolCallStep(extra));

      await waitFor(() => expect(execute).toHaveBeenCalledOnce());
      expect(part()).not.toHaveProperty("providerExecuted");
    },
  );
});

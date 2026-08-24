import type { AssistantRuntime } from "@assistant-ui/core";
import type { UIMessage } from "@ai-sdk/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { DynamicChatTransport } from "./DynamicChatTransport";

const emptyStreamResponse = () =>
  new Response(
    new ReadableStream({ start: (controller) => controller.close() }),
    {
      headers: { "content-type": "text/event-stream" },
    },
  );

const sendMessagesOptions = (chatId: string) => ({
  trigger: "submit-message" as const,
  chatId,
  messageId: undefined,
  messages: [
    {
      id: `message-${chatId}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: "hello" }],
    },
  ],
  abortSignal: undefined,
});

const createRuntime = (system: string) =>
  ({
    thread: {
      getModelContext: () => ({ system }),
    },
  }) as AssistantRuntime;

describe("DynamicChatTransport", () => {
  it("rejects sends without a registered thread context", () => {
    const dynamicTransport = new DynamicChatTransport(
      new AssistantChatTransport<UIMessage>(),
    );

    expect(() =>
      dynamicTransport.getCurrentTransport("missing-thread"),
    ).toThrow(
      'DynamicChatTransport has no registered context for chat "missing-thread"',
    );
  });

  it("keeps AssistantChatTransport wiring scoped per thread", async () => {
    const bodies: Array<{ id: string; system: string }> = [];
    const createTransport = () =>
      new AssistantChatTransport<UIMessage>({
        fetch: vi.fn(async (_input, init) => {
          bodies.push(JSON.parse(String(init?.body)));
          return emptyStreamResponse();
        }),
      });
    const dynamicTransport = new DynamicChatTransport(createTransport());
    const ownerA = {};
    const ownerB = {};

    dynamicTransport.setThreadContext(
      "thread-a",
      ownerA,
      createRuntime("system-a"),
      () => ({
        initialize: async () => ({
          remoteId: "remote-a",
          externalId: undefined,
        }),
      }),
    );
    dynamicTransport.setThreadContext(
      "thread-b",
      ownerB,
      createRuntime("system-b"),
      () => ({
        initialize: async () => ({
          remoteId: "remote-b",
          externalId: undefined,
        }),
      }),
    );

    await dynamicTransport.sendMessages(sendMessagesOptions("thread-a"));
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-b"));

    dynamicTransport.setTransport(createTransport());
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-a"));
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-b"));

    expect(bodies).toEqual([
      expect.objectContaining({ id: "remote-a", system: "system-a" }),
      expect.objectContaining({ id: "remote-b", system: "system-b" }),
      expect.objectContaining({ id: "remote-a", system: "system-a" }),
      expect.objectContaining({ id: "remote-b", system: "system-b" }),
    ]);
    expect(dynamicTransport.getCurrentTransport("thread-a")).not.toBe(
      dynamicTransport.getCurrentTransport("thread-b"),
    );
  });
});

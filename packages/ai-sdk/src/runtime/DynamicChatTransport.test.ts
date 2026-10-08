import type { AssistantRuntime } from "@assistant-ui/core";
import type { UIMessage } from "@ai-sdk/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects sends without a registered thread context", () => {
    const dynamicTransport = new DynamicChatTransport(
      new AssistantChatTransport<UIMessage>(),
    );

    expect(() =>
      dynamicTransport.sendMessages(sendMessagesOptions("missing-thread")),
    ).toThrow(
      'DynamicChatTransport has no registered context for chat "missing-thread"',
    );
  });

  it("keeps AssistantChatTransport wiring scoped per thread", async () => {
    const createTransport = () => {
      const bodies: Array<{ id: string; system: string }> = [];
      const fetch = vi.fn(async (_input, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return emptyStreamResponse();
      });
      return {
        bodies,
        fetch,
        transport: new AssistantChatTransport<UIMessage>({
          fetch,
        }),
      };
    };
    const initial = createTransport();
    const dynamicTransport = new DynamicChatTransport(initial.transport);
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

    const replacement = createTransport();
    dynamicTransport.setTransport(replacement.transport);
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-a"));
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-b"));

    expect(initial.fetch).toHaveBeenCalledTimes(2);
    expect(replacement.fetch).toHaveBeenCalledTimes(2);
    expect(initial.bodies).toEqual([
      expect.objectContaining({ id: "remote-a", system: "system-a" }),
      expect.objectContaining({ id: "remote-b", system: "system-b" }),
    ]);
    expect(replacement.bodies).toEqual([
      expect.objectContaining({ id: "remote-a", system: "system-a" }),
      expect.objectContaining({ id: "remote-b", system: "system-b" }),
    ]);
    expect(dynamicTransport.getCurrentTransport("thread-a")).not.toBe(
      dynamicTransport.getCurrentTransport("thread-b"),
    );
  });

  it("defers replacement clones until a thread uses the transport", async () => {
    const clone = vi.spyOn(
      AssistantChatTransport.prototype,
      "__internal_clone",
    );
    const dynamicTransport = new DynamicChatTransport(
      new AssistantChatTransport<UIMessage>(),
    );
    const owner = {};
    dynamicTransport.setThreadContext(
      "thread-a",
      owner,
      createRuntime("system-a"),
      () => ({
        initialize: async () => ({
          remoteId: "remote-a",
          externalId: undefined,
        }),
      }),
    );
    clone.mockClear();

    for (let index = 0; index < 10; index++) {
      dynamicTransport.setTransport(
        new AssistantChatTransport<UIMessage>({
          fetch: async () => emptyStreamResponse(),
        }),
      );
    }
    dynamicTransport.setThreadContext(
      "thread-a",
      owner,
      createRuntime("updated-system-a"),
      () => ({
        initialize: async () => ({
          remoteId: "updated-remote-a",
          externalId: undefined,
        }),
      }),
    );

    expect(clone).not.toHaveBeenCalled();

    await dynamicTransport.sendMessages(sendMessagesOptions("thread-a"));

    expect(clone).toHaveBeenCalledOnce();
  });

  it("retries a replacement clone after cloning throws", async () => {
    const initialFetch = vi.fn(async () => emptyStreamResponse());
    const dynamicTransport = new DynamicChatTransport(
      new AssistantChatTransport<UIMessage>({ fetch: initialFetch }),
    );
    dynamicTransport.setThreadContext(
      "thread-a",
      {},
      createRuntime("system-a"),
      () => ({
        initialize: async () => ({
          remoteId: "remote-a",
          externalId: undefined,
        }),
      }),
    );
    await dynamicTransport.sendMessages(sendMessagesOptions("thread-a"));

    const replacement = new AssistantChatTransport<UIMessage>();
    const cloneError = new Error("clone failed");
    const clone = vi
      .spyOn(replacement, "__internal_clone")
      .mockImplementation(() => {
        throw cloneError;
      });
    dynamicTransport.setTransport(replacement);

    expect(() =>
      dynamicTransport.sendMessages(sendMessagesOptions("thread-a")),
    ).toThrow(cloneError);
    expect(() =>
      dynamicTransport.sendMessages(sendMessagesOptions("thread-a")),
    ).toThrow(cloneError);
    expect(clone).toHaveBeenCalledTimes(2);
    expect(initialFetch).toHaveBeenCalledOnce();
  });
});

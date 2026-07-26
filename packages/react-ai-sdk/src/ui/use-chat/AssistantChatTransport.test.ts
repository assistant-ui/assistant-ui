import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantChatTransport } from "./AssistantChatTransport";

const emptyStreamResponse = () =>
  new Response(
    new ReadableStream({ start: (controller) => controller.close() }),
    {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    },
  );

const createThreadListItem = (remoteId: string) => ({
  initialize: vi.fn(async () => ({ remoteId, externalId: undefined })),
});

const sendMessagesOptions = {
  trigger: "submit-message" as const,
  chatId: "local-chat-id",
  messageId: undefined,
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }],
  abortSignal: undefined,
};

describe("AssistantChatTransport.prepareSendMessagesRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the initialized remote thread id to prepareSendMessagesRequest as options.id", async () => {
    const threadListItem = createThreadListItem("remote-thread-id");
    const captured: { id: unknown } = { id: undefined };
    const fetchMock = vi.fn(async () => emptyStreamResponse());

    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
      prepareSendMessagesRequest: async (options) => {
        captured.id = options.id;
        return { body: { id: options.id } };
      },
    });
    transport.__internal_setGetThreadListItem(() => threadListItem as never);

    await transport.sendMessages(sendMessagesOptions as never);

    expect(captured.id).toBe("remote-thread-id");
    expect(threadListItem.initialize).toHaveBeenCalledTimes(1);
  });

  it("uses the initialized remote thread id in the default request body", async () => {
    const threadListItem = createThreadListItem("remote-thread-id");
    let capturedBody: string | undefined;
    const fetchMock = vi.fn(
      async (_input: unknown, init: { body?: string } | undefined) => {
        capturedBody = init?.body;
        return emptyStreamResponse();
      },
    );

    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
    });
    transport.__internal_setGetThreadListItem(() => threadListItem as never);

    await transport.sendMessages(sendMessagesOptions as never);

    expect(threadListItem.initialize).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(capturedBody as string);
    expect(body.id).toBe("remote-thread-id");
    expect(body.messages).toEqual(sendMessagesOptions.messages);
    expect(body.trigger).toBe("submit-message");
    expect(body.messageId).toBeUndefined();
  });

  it("falls back to the local chat id when no thread list item is available", async () => {
    const captured: { id: unknown } = { id: undefined };
    const fetchMock = vi.fn(async () => emptyStreamResponse());

    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
      prepareSendMessagesRequest: async (options) => {
        captured.id = options.id;
        return { body: { id: options.id } };
      },
    });
    transport.__internal_setGetThreadListItem(() => undefined);

    await transport.sendMessages(sendMessagesOptions as never);

    expect(captured.id).toBe("local-chat-id");
  });
});

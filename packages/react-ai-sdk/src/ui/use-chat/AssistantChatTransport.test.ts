import { beforeEach, describe, expect, it, vi } from "vitest";

import { RESUMABLE_STREAM_ID_HEADER } from "../resumable";
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

  it("stores response stream ids under the local thread id", async () => {
    const setStreamId = vi.fn();
    const fetchMock = vi.fn(async () => {
      return new Response(
        new ReadableStream({ start: (controller) => controller.close() }),
        {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
          },
        },
      );
    });
    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
      resumable: {
        storage: {
          getStreamId: vi.fn(),
          setStreamId,
          clear: vi.fn(),
        },
        resumeApi: "/api/chat/resume",
      },
    });

    await transport.sendMessages(sendMessagesOptions as never);

    expect(setStreamId).toHaveBeenCalledWith("stream-1", "local-chat-id");
    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.has("x-assistant-ui-resumable-thread-id")).toBe(
      false,
    );
  });

  it("does not add the resumable thread header without resumable storage", async () => {
    const fetchMock = vi.fn(async () => emptyStreamResponse());
    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
    });

    await transport.sendMessages(sendMessagesOptions as never);

    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.has("x-assistant-ui-resumable-thread-id")).toBe(
      false,
    );
  });

  it("reads reconnect stream ids under the local thread id", async () => {
    const getStreamId = vi.fn(() => "stream-1");
    const fetchMock = vi.fn(async () => emptyStreamResponse());
    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
      resumable: {
        storage: {
          getStreamId,
          setStreamId: vi.fn(),
          clear: vi.fn(),
        },
        resumeApi: (streamId) => `/api/chat/resume/${streamId}`,
      },
    });

    await transport.reconnectToStream({ chatId: "local-chat-id" });

    expect(getStreamId).toHaveBeenCalledWith("local-chat-id");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/chat/resume/stream-1");
  });
});

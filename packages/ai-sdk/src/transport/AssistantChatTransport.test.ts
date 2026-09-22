import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { RESUMABLE_STREAM_ID_HEADER } from "./resumable";
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
    const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => {
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
    const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) =>
      emptyStreamResponse(),
    );
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
    const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) =>
      emptyStreamResponse(),
    );
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
    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.has("x-assistant-ui-resumable-thread-id")).toBe(
      false,
    );
  });
});

const createMemoryStorage = (initialId: string | null = null) => {
  let id = initialId;
  return {
    getStreamId: () => id,
    setStreamId: (next: string) => {
      id = next;
    },
    clear: () => {
      id = null;
    },
  };
};

// A null-body status response carrying a non-null empty body, as WebKit returns
// for a 204. The JS `Response` constructor cannot represent a null-body status
// with a body, so this is a plain object shaped like a Response.
const nullBodyStatusWithBody = (status: number) =>
  ({
    status,
    statusText: "",
    headers: new Headers(),
    body: new ReadableStream({ start: (controller) => controller.close() }),
  }) as unknown as Response;

// The resumable wrapper replaces the transport's `fetch`, which is protected on
// the upstream `HttpChatTransport`; reach it through a structural cast.
const wrappedFetchOf = (
  transport: AssistantChatTransport<UIMessage>,
): ((input: string, init?: unknown) => Promise<Response>) =>
  (
    transport as unknown as {
      fetch: (input: string, init?: unknown) => Promise<Response>;
    }
  ).fetch;

describe("AssistantChatTransport resumable fetch wrapper", () => {
  it("keeps a replacement checkpoint set while preparing an older reconnect", async () => {
    const storage = createMemoryStorage("stream-old");
    let finishPrepare!: () => void;
    const prepareReconnectToStreamRequest = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        finishPrepare = resolve;
      });
      return { headers: { "x-custom": "retained" } };
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const transport = new AssistantChatTransport({
      fetch,
      prepareReconnectToStreamRequest,
      resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
    });
    const pending = transport.reconnectToStream({ chatId: "thread" });
    await vi.waitFor(() =>
      expect(prepareReconnectToStreamRequest).toHaveBeenCalledOnce(),
    );
    storage.setStreamId("stream-new");
    finishPrepare();
    await expect(pending).resolves.toBeNull();
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/resume/stream-old");
    expect(
      Array.from(new Headers(fetch.mock.calls[0]?.[1]?.headers).entries()),
    ).toEqual([["x-custom", "retained"]]);
    expect(storage.getStreamId()).toBe("stream-new");
  });

  it("keeps a newer checkpoint when an older reconnect returns no content", async () => {
    const storage = createMemoryStorage("stream-old");
    let respond!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    const transport = new AssistantChatTransport({
      fetch,
      resumable: { storage, resumeApi: "/api/resume" },
    });
    const pending = transport.reconnectToStream({ chatId: "thread" });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    storage.setStreamId("stream-new");
    respond(new Response(null, { status: 204 }));
    await expect(pending).resolves.toBeNull();
    expect(storage.getStreamId()).toBe("stream-new");
  });

  it("passes a 204 with a non-null empty body through untouched (WebKit)", async () => {
    const response = nullBodyStatusWithBody(204);
    const fetchMock = vi.fn(async () => response);
    const transport = new AssistantChatTransport({
      resumable: {
        storage: createMemoryStorage(),
        resumeApi: "/api/resume",
      },
      fetch: fetchMock as never,
    });

    const res = await wrappedFetchOf(transport)("https://example.com", {});

    expect(res).toBe(response);
    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes a 204 with a null body through untouched", async () => {
    const response = new Response(null, { status: 204 });
    const fetchMock = vi.fn(async () => response);
    const transport = new AssistantChatTransport({
      resumable: {
        storage: createMemoryStorage(),
        resumeApi: "/api/resume",
      },
      fetch: fetchMock as never,
    });

    const res = await wrappedFetchOf(transport)("https://example.com", {});

    expect(res).toBe(response);
    expect(res.status).toBe(204);
  });

  it("passes other null-body statuses with a body through untouched", async () => {
    const response = nullBodyStatusWithBody(304);
    const fetchMock = vi.fn(async () => response);
    const transport = new AssistantChatTransport({
      resumable: {
        storage: createMemoryStorage(),
        resumeApi: "/api/resume",
      },
      fetch: fetchMock as never,
    });

    const res = await wrappedFetchOf(transport)("https://example.com", {});

    expect(res).toBe(response);
    expect(res.status).toBe(304);
  });

  it("still reconstructs and taps a normal streaming response, clearing storage on finish", async () => {
    const storage = createMemoryStorage("stream-id-123");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"finish"}\n\n'),
        );
        controller.close();
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
    const fetchMock = vi.fn(async () => response);
    const transport = new AssistantChatTransport({
      resumable: { storage, resumeApi: "/api/resume" },
      fetch: fetchMock as never,
    });

    const res = await wrappedFetchOf(transport)("https://example.com", {});

    expect(res.status).toBe(200);
    expect(res).not.toBe(response);
    expect(res.body).not.toBeNull();
    const reader = res.body!.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    expect(storage.getStreamId()).toBeNull();
  });
});

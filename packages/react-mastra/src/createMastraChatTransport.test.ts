import { describe, expect, it, vi } from "vitest";
import { createMastraChatTransport } from "./createMastraChatTransport";

const response = () =>
  new Response('data: {"type":"finish"}\n\n', {
    headers: { "Content-Type": "text/event-stream" },
  });

describe("createMastraChatTransport", () => {
  it("sends the settled thread and resource as Mastra memory", async () => {
    const fetch = vi.fn(async () => response());
    const transport = createMastraChatTransport({
      resourceId: "user-1",
      fetch,
    });
    transport.__internal_setGetThreadListItem(() => ({
      initialize: async () => ({
        remoteId: "thread-1",
        externalId: undefined,
      }),
    }));

    await transport.sendMessages({
      trigger: "submit-message",
      chatId: "local-thread",
      messageId: undefined,
      messages: [],
      abortSignal: undefined,
    });

    const init = fetch.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      id: "thread-1",
      messages: [],
      memory: { thread: "thread-1", resource: "user-1" },
    });
  });

  it("merges custom request preparation without dropping memory", async () => {
    const fetch = vi.fn(async () => response());
    const transport = createMastraChatTransport({
      resourceId: "user-1",
      fetch,
      prepareSendMessagesRequest: () => ({
        body: {
          agentId: "agent-1",
          memory: { thread: "wrong", resource: "wrong" },
        },
      }),
    });

    await transport.sendMessages({
      trigger: "submit-message",
      chatId: "thread-1",
      messageId: undefined,
      messages: [],
      abortSignal: undefined,
    });

    const init = fetch.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      agentId: "agent-1",
      memory: { thread: "thread-1", resource: "user-1" },
    });
  });
});

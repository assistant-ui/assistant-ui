import { describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "./AssistantChatTransport";

const makeResponse = () =>
  new Response('data: {"type":"finish"}\n\n', {
    headers: { "Content-Type": "text/event-stream" },
  });

const sendMessages = (transport: AssistantChatTransport) =>
  transport.sendMessages({
    trigger: "submit-message",
    chatId: "local-thread",
    messageId: undefined,
    messages: [],
    abortSignal: undefined,
  });

describe("AssistantChatTransport", () => {
  it("passes the initialized remote thread ID to request preparation", async () => {
    const prepareSendMessagesRequest = vi.fn((options) => ({
      body: { id: options.id, messages: options.messages },
    }));
    const transport = new AssistantChatTransport({
      fetch: vi.fn(async () => makeResponse()),
      prepareSendMessagesRequest,
    });
    const initialize = vi.fn(async () => ({
      remoteId: "remote-thread",
      externalId: undefined,
    }));
    transport.__internal_setGetThreadListItem(() => ({ initialize }));

    await sendMessages(transport);

    expect(initialize).toHaveBeenCalledOnce();
    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: "remote-thread" }),
    );
  });

  it("keeps the initialized remote thread ID in the default request body", async () => {
    const fetch = vi.fn(async () => makeResponse());
    const transport = new AssistantChatTransport({ fetch });
    transport.__internal_setGetThreadListItem(() => ({
      initialize: async () => ({
        remoteId: "remote-thread",
        externalId: undefined,
      }),
    }));

    await sendMessages(transport);

    const init = fetch.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      id: "remote-thread",
      messages: [],
      trigger: "submit-message",
    });
  });
});

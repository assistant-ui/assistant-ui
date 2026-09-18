import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadMessages } from "./AssistantCloudThreadMessages";
import { CloudResponseError } from "./cloudResponse";

const createCloudThreadMessages = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return {
    messages: new AssistantCloudThreadMessages(api),
    makeRequest,
  };
};

describe("AssistantCloudThreadMessages responses", () => {
  it("validates created message IDs", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    const body = {
      parent_id: null,
      format: "aui/v0",
      content: {},
    };
    makeRequest.mockResolvedValueOnce({ message_id: "message-1" });

    await expect(messages.create("thread-1", body)).resolves.toEqual({
      message_id: "message-1",
    });

    makeRequest.mockResolvedValueOnce({});

    await expect(messages.create("thread-1", body)).rejects.toThrow(
      'Invalid Assistant Cloud response for "message_id": expected a string',
    );
  });

  it("submits and validates message feedback", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    const body = { type: "positive" as const };
    makeRequest.mockResolvedValueOnce({
      feedback_id: "feedback-1",
      type: "positive",
    });

    await expect(
      messages.feedback("thread/1", "message/1", body),
    ).resolves.toStrictEqual({
      feedback_id: "feedback-1",
      type: "positive",
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "/threads/thread%2F1/messages/message%2F1/feedback",
      { method: "POST", body: { type: "positive" } },
    );
    expect(makeRequest.mock.calls[0]![1].body).toStrictEqual({
      type: "positive",
    });

    const bodyWithComment = {
      type: "negative" as const,
      comment: "The response missed a detail",
    };
    makeRequest.mockResolvedValueOnce({
      feedback_id: "feedback-2",
      type: "negative",
      comment: "The response missed a detail",
    });

    await expect(
      messages.feedback("thread-1", "message-1", bodyWithComment),
    ).resolves.toEqual({
      feedback_id: "feedback-2",
      type: "negative",
      comment: "The response missed a detail",
    });
    expect(makeRequest).toHaveBeenLastCalledWith(
      "/threads/thread-1/messages/message-1/feedback",
      { method: "POST", body: bodyWithComment },
    );

    makeRequest.mockResolvedValueOnce({
      feedback_id: "feedback-3",
      type: "positive",
      comment: null,
    });

    await expect(
      messages.feedback("thread-1", "message-1", body),
    ).resolves.toStrictEqual({
      feedback_id: "feedback-3",
      type: "positive",
      comment: null,
    });

    makeRequest.mockResolvedValueOnce({ type: "positive" });

    await expect(
      messages.feedback("thread-1", "message-1", body),
    ).rejects.toBeInstanceOf(CloudResponseError);

    makeRequest.mockResolvedValueOnce({
      feedback_id: "feedback-1",
      type: "neutral",
    });

    await expect(
      messages.feedback("thread-1", "message-1", body),
    ).rejects.toThrow('expected one of "positive", "negative"');
  });

  it("decodes canonical message responses without changing content", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValue({
      messages: [
        {
          id: "message-1",
          parent_id: null,
          height: 0,
          created_at: "2026-07-16T13:00:00.000Z",
          updated_at: "2026-07-16T13:05:00.987Z",
          format: "aui/v0",
          content: { created_at: "leave-this-string-untouched" },
        },
      ],
    });

    const result = await messages.list("thread-1");
    const message = result.messages[0]!;

    expect(message.created_at).toBeInstanceOf(Date);
    expect(message.updated_at).toBeInstanceOf(Date);
    expect(message.updated_at.toISOString()).toBe("2026-07-16T13:05:00.987Z");
    expect(message.content).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });

  it("forwards the pagination query to the list endpoint", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValueOnce({ messages: [] });

    await messages.list("thread/1", {
      format: "aui/v0",
      limit: 200,
      after: "message-200",
    });

    expect(makeRequest).toHaveBeenCalledWith("/threads/thread%2F1/messages", {
      query: { format: "aui/v0", limit: 200, after: "message-200" },
    });
  });
});

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
  it("deletes message IDs from the encoded thread path", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValue(undefined);

    await messages.delete("thread/1", ["msg_1", "msg_2"]);

    expect(makeRequest).toHaveBeenCalledWith("/threads/thread%2F1/messages", {
      method: "DELETE",
      body: { message_ids: ["msg_1", "msg_2"] },
    });
  });

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
      feedback_id: "feedback-1",
      type: "positive",
    });
    await messages.feedback("thread-1", "message-1", {
      type: "positive",
      comment: "   ",
    });
    expect(makeRequest.mock.lastCall![1].body).toStrictEqual({
      type: "positive",
    });

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

describe("AssistantCloudThreadMessages run leases", () => {
  it("opens a run on create and decodes the lease", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValueOnce({
      message_id: "msg_1",
      lease_id: "lease_1",
      expires_in_ms: 90000,
      heartbeat_interval_ms: 20000,
    });

    await expect(
      messages.create("t1", {
        parent_id: null,
        format: "aui/v0",
        content: {},
        open_run: true,
      }),
    ).resolves.toEqual({
      message_id: "msg_1",
      run: {
        lease_id: "lease_1",
        expires_in_ms: 90000,
        heartbeat_interval_ms: 20000,
      },
    });
    expect(makeRequest.mock.calls[0]![1].body).toMatchObject({
      open_run: true,
    });

    makeRequest.mockResolvedValueOnce({ message_id: "msg_1" });
    await messages.create("t1", {
      parent_id: null,
      format: "aui/v0",
      content: {},
      external_id: "e1",
      lease_id: "lease_1",
    });
    expect(makeRequest.mock.calls[1]![1].body).toMatchObject({
      lease_id: "lease_1",
    });
    expect(makeRequest.mock.calls[1]![1].body).not.toHaveProperty("open_run");
  });

  it("sends the lease id on update", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValueOnce(undefined);
    await messages.update("t1", "msg_1", { content: {}, lease_id: "lease_1" });
    expect(makeRequest).toHaveBeenCalledWith("/threads/t1/messages/msg_1", {
      method: "PUT",
      body: { content: {}, lease_id: "lease_1" },
    });
  });

  it("decodes the run state of listed messages", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    const row = {
      id: "msg_1",
      parent_id: null,
      height: 0,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      format: "aui/v0",
      content: {},
    };
    makeRequest.mockResolvedValueOnce({
      messages: [
        { ...row, run: { status: "running", expires_in_ms: 1200 } },
        { ...row, id: "msg_2", run: { status: "stale", superseded_by: "m" } },
        { ...row, id: "msg_3", run: null },
      ],
    });

    const { messages: listed } = await messages.list("t1");
    expect(listed.map((m) => m.run)).toEqual([
      { status: "running", expires_in_ms: 1200 },
      { status: "stale", superseded_by: "m" },
      undefined,
    ]);

    makeRequest.mockResolvedValueOnce({
      messages: [{ ...row, run: { status: "paused" } }],
    });
    await expect(messages.list("t1")).rejects.toThrow(CloudResponseError);
  });
});

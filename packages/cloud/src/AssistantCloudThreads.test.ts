import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreads } from "./AssistantCloudThreads";

const createCloudThreads = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { threads: new AssistantCloudThreads(api), makeRequest };
};

const threadResponse = {
  title: null,
  last_message_at: "2026-07-16T12:30:00.000Z",
  metadata: { created_at: "leave-this-string-untouched" },
  external_id: null,
  id: "thread-1",
  project_id: "project-1",
  created_at: "2026-07-16T12:00:00.000Z",
  updated_at: "2026-07-16T12:15:00.123Z",
  workspace_id: "workspace-1",
  is_archived: false,
};

describe("AssistantCloudThreads responses", () => {
  it("decodes canonical thread list responses", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({ threads: [threadResponse] });

    const result = await threads.list();
    const thread = result.threads[0]!;

    expect(thread.created_at).toBeInstanceOf(Date);
    expect(thread.updated_at).toBeInstanceOf(Date);
    expect(thread.last_message_at).toBeInstanceOf(Date);
    expect(thread.updated_at.toISOString()).toBe("2026-07-16T12:15:00.123Z");
    expect(thread.title).toBe("");
    expect(thread.metadata).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });

  it("unwraps and decodes a single thread response", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({ thread: threadResponse });

    const result = await threads.get("thread-1");

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });

  it("rejects a bare thread that is missing the response envelope", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue(threadResponse);

    await expect(threads.get("thread-1")).rejects.toThrow(
      'Invalid Assistant Cloud response for "thread": expected an object',
    );
  });

  it("decodes canonical message responses without changing content", async () => {
    const { threads, makeRequest } = createCloudThreads();
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

    const result = await threads.messages.list("thread-1");
    const message = result.messages[0]!;

    expect(message.created_at).toBeInstanceOf(Date);
    expect(message.updated_at).toBeInstanceOf(Date);
    expect(message.updated_at.toISOString()).toBe("2026-07-16T13:05:00.987Z");
    expect(message.content).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });

  it("rejects genuinely invalid response timestamps with field context", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      thread: {
        ...threadResponse,
        updated_at: "not-a-timestamp",
      },
    });

    await expect(threads.get("thread-1")).rejects.toThrow(
      'Invalid Assistant Cloud response for "thread.updated_at": expected a canonical ISO timestamp',
    );
  });
});

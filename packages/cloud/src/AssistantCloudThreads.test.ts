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
  it("validates created thread IDs", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValueOnce({ thread_id: "thread-1" });

    await expect(
      threads.create({ last_message_at: new Date() }),
    ).resolves.toEqual({ thread_id: "thread-1" });

    makeRequest.mockResolvedValueOnce({});

    await expect(
      threads.create({ last_message_at: new Date() }),
    ).rejects.toThrow(
      'Invalid Assistant Cloud response for "thread_id": expected a string',
    );
  });

  it("claims anonymous threads and validates the moved count", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValueOnce({ moved: 2 });

    await expect(
      threads.claim({ refresh_token: "anonymous-refresh" }),
    ).resolves.toEqual({ moved: 2 });
    expect(makeRequest).toHaveBeenLastCalledWith("/threads/claim", {
      method: "POST",
      body: { refresh_token: "anonymous-refresh" },
    });

    makeRequest.mockResolvedValueOnce({ moved: 1.5 });

    await expect(
      threads.claim({ refresh_token: "anonymous-refresh" }),
    ).rejects.toThrow(
      'Invalid Assistant Cloud response for "moved": expected an integer',
    );
  });

  it("forwards both archive filter values", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({ threads: [] });

    await threads.list({ is_archived: false });
    expect(makeRequest).toHaveBeenLastCalledWith("/threads", {
      query: { is_archived: "false" },
    });

    await threads.list({ is_archived: true });
    expect(makeRequest).toHaveBeenLastCalledWith("/threads", {
      query: { is_archived: "true" },
    });
  });

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

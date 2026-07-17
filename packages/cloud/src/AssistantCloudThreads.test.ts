import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreads } from "./AssistantCloudThreads";
import { OriginalDate } from "./tests/setup";

const mockedDate = globalThis.Date;

beforeAll(() => {
  globalThis.Date = OriginalDate;
});

afterAll(() => {
  globalThis.Date = mockedDate;
});

const createCloudThreads = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { threads: new AssistantCloudThreads(api), makeRequest };
};

const threadResponse = {
  title: "Support",
  last_message_at: "2026-07-16T12:30:00.000Z",
  metadata: { created_at: "leave-this-string-untouched" },
  external_id: null,
  id: "thread-1",
  project_id: "project-1",
  created_at: "2026-07-16T12:00:00.000Z",
  updated_at: "2026-07-16 12:15:00.123456",
  workspace_id: "workspace-1",
  is_archived: false,
};

describe("AssistantCloudThreads response timestamps", () => {
  it("normalizes mixed thread timestamp formats into Date objects", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({ threads: [threadResponse] });

    const result = await threads.list();
    const thread = result.threads[0]!;

    expect(thread.created_at).toBeInstanceOf(OriginalDate);
    expect(thread.updated_at).toBeInstanceOf(OriginalDate);
    expect(thread.last_message_at).toBeInstanceOf(OriginalDate);
    expect(thread.updated_at.toISOString()).toBe("2026-07-16T12:15:00.123Z");
    expect(thread.updated_at.getTime()).toBe(
      OriginalDate.parse("2026-07-16T12:15:00.123Z"),
    );
    expect(thread.metadata).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });

  it("normalizes timestamps when fetching one thread", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue(threadResponse);

    const result = await threads.get("thread-1");

    expect(result.created_at).toBeInstanceOf(OriginalDate);
    expect(result.created_at.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });

  it("uses created_at when last_message_at is missing", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      ...threadResponse,
      last_message_at: null,
    });

    const result = await threads.get("thread-1");

    expect(result.last_message_at).toEqual(result.created_at);
  });

  it("normalizes mixed message timestamp formats without changing content", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      messages: [
        {
          id: "message-1",
          parent_id: null,
          height: 0,
          created_at: "2026-07-16T13:00:00.000Z",
          updated_at: "2026-07-16 13:05:00.987654",
          format: "aui/v0",
          content: { created_at: "leave-this-string-untouched" },
        },
      ],
    });

    const result = await threads.messages.list("thread-1");
    const message = result.messages[0]!;

    expect(message.created_at).toBeInstanceOf(OriginalDate);
    expect(message.updated_at).toBeInstanceOf(OriginalDate);
    expect(message.updated_at.toISOString()).toBe("2026-07-16T13:05:00.987Z");
    expect(message.content).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });

  it("rejects genuinely invalid response timestamps with field context", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      ...threadResponse,
      updated_at: "not-a-timestamp",
    });

    await expect(threads.get("thread-1")).rejects.toThrow(
      'Invalid Assistant Cloud response timestamp for "thread.updated_at"',
    );
  });
});

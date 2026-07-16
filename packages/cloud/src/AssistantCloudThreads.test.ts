import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreads } from "./AssistantCloudThreads";

const mockedDate = globalThis.Date;
const NativeDate = Object.getPrototypeOf(
  (mockedDate as unknown as () => Date)(),
).constructor as DateConstructor;

beforeAll(() => {
  globalThis.Date = NativeDate;
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
  updated_at: "2026-07-16T12:15:00.000Z",
  workspace_id: "workspace-1",
  is_archived: false,
};

describe("AssistantCloudThreads response timestamps", () => {
  it("normalizes thread list timestamps without changing metadata", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({ threads: [threadResponse] });

    const result = await threads.list();

    expect(result.threads[0]).toMatchObject({
      last_message_at: new NativeDate("2026-07-16T12:30:00.000Z"),
      created_at: new NativeDate("2026-07-16T12:00:00.000Z"),
      updated_at: new NativeDate("2026-07-16T12:15:00.000Z"),
      metadata: { created_at: "leave-this-string-untouched" },
    });
    expect(threadResponse.created_at).toBe("2026-07-16T12:00:00.000Z");
  });

  it("normalizes timestamps when fetching one thread", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue(threadResponse);

    const result = await threads.get("thread-1");

    expect(result.created_at).toBeInstanceOf(NativeDate);
    expect(result.created_at.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });

  it("normalizes message timestamps without changing content", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      messages: [
        {
          id: "message-1",
          parent_id: null,
          height: 0,
          created_at: "2026-07-16T13:00:00.000Z",
          updated_at: "2026-07-16T13:05:00.000Z",
          format: "aui/v0",
          content: { created_at: "leave-this-string-untouched" },
        },
      ],
    });

    const result = await threads.messages.list("thread-1");

    expect(result.messages[0]).toMatchObject({
      created_at: new NativeDate("2026-07-16T13:00:00.000Z"),
      updated_at: new NativeDate("2026-07-16T13:05:00.000Z"),
      content: { created_at: "leave-this-string-untouched" },
    });
  });

  it("rejects malformed response timestamps with field context", async () => {
    const { threads, makeRequest } = createCloudThreads();
    makeRequest.mockResolvedValue({
      ...threadResponse,
      created_at: "not-a-timestamp",
    });

    await expect(threads.get("thread-1")).rejects.toThrow(
      'Invalid Assistant Cloud response timestamp for "thread.created_at"',
    );
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AssistantCloudProjects } from "../AssistantCloudProjects";
import type { AssistantCloudAPI } from "../AssistantCloudAPI";

vi.mock("../AssistantCloudAPI");

describe("AssistantCloudProjects", () => {
  let projects: AssistantCloudProjects;
  let mockApi: AssistantCloudAPI;

  beforeEach(() => {
    mockApi = {
      makeRequest: vi.fn().mockResolvedValue({}),
      makeRawRequest: vi.fn(),
      _auth: { getAuthHeaders: vi.fn() },
      _baseUrl: "https://backend.assistant-api.com",
    } as unknown as AssistantCloudAPI;

    projects = new AssistantCloudProjects(mockApi);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists project threads with the query", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({ threads: [] });

    await projects.threads.list({ limit: 10, after: "t1" });

    expect(mockApi.makeRequest).toHaveBeenCalledWith("/projects/threads", {
      query: { limit: 10, after: "t1" },
    });
  });

  it("sends both archive filter values as strings", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({ threads: [] });

    await projects.threads.list({ is_archived: false });
    expect(mockApi.makeRequest).toHaveBeenLastCalledWith("/projects/threads", {
      query: { is_archived: "false" },
    });

    await projects.threads.list({ is_archived: true });
    expect(mockApi.makeRequest).toHaveBeenLastCalledWith("/projects/threads", {
      query: { is_archived: "true" },
    });
  });

  it("lists project thread messages with the query", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({ messages: [] });

    await projects.threads.messages.list("thread_123", {
      format: "ai-sdk/v5",
      limit: 100,
      after: "msg_9",
    });

    expect(mockApi.makeRequest).toHaveBeenCalledWith(
      "/projects/threads/thread_123/messages",
      { query: { format: "ai-sdk/v5", limit: 100, after: "msg_9" } },
    );
  });

  it("url-encodes the thread id in the messages path", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({ messages: [] });

    await projects.threads.messages.list("thread/with space");

    expect(mockApi.makeRequest).toHaveBeenCalledWith(
      "/projects/threads/thread%2Fwith%20space/messages",
      { query: undefined },
    );
  });

  it("decodes project thread list responses", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({
      threads: [
        {
          title: "Project thread",
          last_message_at: "2026-07-16T12:30:00.000Z",
          metadata: {},
          external_id: null,
          id: "thread_1",
          project_id: "project_1",
          created_at: "2026-07-16T12:00:00.000Z",
          updated_at: "2026-07-16T12:15:00.000Z",
          workspace_id: "workspace_1",
          is_archived: false,
        },
      ],
    });

    const result = await projects.threads.list();
    const thread = result.threads[0]!;

    expect(thread.last_message_at instanceof Date).toBe(true);
    expect(thread.is_archived).toBeTypeOf("boolean");
  });

  it("decodes project thread message list responses", async () => {
    vi.mocked(mockApi.makeRequest).mockResolvedValue({
      messages: [
        {
          id: "message_1",
          parent_id: null,
          height: 0,
          created_at: "2026-07-16T13:00:00.000Z",
          updated_at: "2026-07-16T13:05:00.000Z",
          format: "aui/v0",
          content: {},
        },
      ],
    });

    const result = await projects.threads.messages.list("thread_1");
    const message = result.messages[0]!;

    expect(message.created_at instanceof Date).toBe(true);
  });
});

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
    await projects.threads.list({ limit: 10, after: "t1" });

    expect(mockApi.makeRequest).toHaveBeenCalledWith("/projects/threads", {
      query: { limit: 10, after: "t1" },
    });
  });

  it("lists project thread messages with the query", async () => {
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
    await projects.threads.messages.list("thread/with space");

    expect(mockApi.makeRequest).toHaveBeenCalledWith(
      "/projects/threads/thread%2Fwith%20space/messages",
      { query: undefined },
    );
  });
});

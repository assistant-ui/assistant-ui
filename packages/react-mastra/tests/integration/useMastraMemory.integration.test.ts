import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMastraMemory } from "../../src/useMastraMemory";
import { unlinkSync, existsSync } from "fs";

const TEST_DB = "./test-mastra-memory.db";

describe("useMastraMemory - Real Mastra Integration", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Clean up test database
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }

    // Save original fetch before mocking
    originalFetch = global.fetch;
    // Mock fetch to simulate API responses
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Clean up test database
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }

    // Restore original fetch to prevent test leakage
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("should create and retrieve threads via API", async () => {
    // Mock API responses
    (global.fetch as any).mockImplementation(
      async (url: string, options: any) => {
        if (url.endsWith("/api/memory/threads") && options.method === "POST") {
          const body = options.body ? JSON.parse(options.body) : {};
          return {
            ok: true,
            json: async () => ({
              thread: {
                id: body.threadId || "test-thread-id",
                resourceId: body.resourceId || "test-user",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: body.metadata || {},
              },
            }),
          };
        }

        if (url.endsWith("/api/memory/threads/test-thread-id")) {
          return {
            ok: true,
            json: async () => ({
              thread: {
                id: "test-thread-id",
                resourceId: "test-user",
                messages: [
                  {
                    id: "msg-1",
                    role: "user",
                    content: "Hello",
                    createdAt: new Date().toISOString(),
                    metadata: {},
                  },
                  {
                    id: "msg-2",
                    role: "assistant",
                    content: "Hi there!",
                    createdAt: new Date().toISOString(),
                    metadata: {},
                  },
                ],
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      },
    );

    const { result } = renderHook(() =>
      useMastraMemory({
        storage: "libsql",
        userId: "test-user",
      }),
    );

    // Create thread
    let threadId: string | undefined;
    await act(async () => {
      threadId = await result.current.createThread();
    });

    expect(threadId).toBeDefined();
    expect(result.current.currentThread).toBe(threadId);

    // Retrieve thread context
    await act(async () => {
      const threadState =
        await result.current.getThreadContext("test-thread-id");
      expect(threadState.id).toBe("test-thread-id");
      expect(threadState.messages.length).toBe(2);
      expect(threadState.messages[0]?.content).toBe("Hello");
    });

    // Verify fetch calls were made
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads",
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread-id",
    );
  });

  it("should search memory via API", async () => {
    // Mock API responses
    (global.fetch as any).mockImplementation(
      async (url: string, options: any) => {
        if (url.endsWith("/api/memory/query") && options.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  content: "I love pizza",
                  metadata: { source: "memory" },
                  similarity: 0.9,
                  threadId: "test-thread-id",
                  timestamp: new Date().toISOString(),
                },
                {
                  content: "My favorite food is pasta",
                  metadata: { source: "memory" },
                  similarity: 0.8,
                  threadId: "test-thread-id",
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          };
        }

        if (url.endsWith("/api/memory/threads") && options.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              thread: {
                id: "test-thread-id",
                resourceId: "test-user",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {},
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      },
    );

    const { result } = renderHook(() =>
      useMastraMemory({
        storage: "libsql",
        userId: "test-user",
        similarityThreshold: 0.7,
        maxResults: 3,
      }),
    );

    // Create thread first
    let threadId: string | undefined;
    await act(async () => {
      threadId = await result.current.createThread();
    });

    expect(threadId).toBeDefined();

    // Search memory
    let searchResults: any[] = [];
    await act(async () => {
      searchResults = await result.current.searchMemory({
        query: "What foods do I like?",
        threadId: "test-thread-id",
        limit: 3,
      });
    });

    expect(searchResults.length).toBe(2);
    expect(searchResults[0]?.similarity).toBeGreaterThanOrEqual(0.7);
    expect(searchResults[1]?.similarity).toBeGreaterThanOrEqual(0.7);

    // Verify fetch call was made
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/query",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

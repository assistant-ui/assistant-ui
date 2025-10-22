import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraMemory } from "./useMastraMemory";
import { MastraMemoryConfig } from "./types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock the uuid module
vi.mock("uuid", () => ({
  v4: () => "test-thread-id",
}));

describe("useMastraMemory", () => {
  const mockMemoryConfig: MastraMemoryConfig = {
    storage: "libsql",
    threadId: "test-thread",
    userId: "test-user",
    maxResults: 10,
    similarityThreshold: 0.8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    expect(result.current.threads.size).toBe(0);
    expect(result.current.currentThread).toBe("test-thread");
    expect(result.current.isSearching).toBe(false);
  });

  it("should search memory via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            content: "Previous conversation about cooking",
            metadata: { source: "memory" },
            similarity: 0.9,
            threadId: "test-thread",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "cooking preferences",
        threadId: "test-thread",
      });
    });

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]?.similarity).toBe(0.9);
    expect(searchResults[0]?.content).toContain("cooking");
    expect(result.current.isSearching).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/query",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("cooking preferences"),
      }),
    );
  });

  it("should create new thread via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread-id",
          resourceId: "test-user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { source: "test" },
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadId = await act(async () => {
      return await result.current.createThread({ source: "test" });
    });

    expect(threadId).toBe("test-thread-id");
    expect(result.current.currentThread).toBe("test-thread-id");
    expect(result.current.threads.has("test-thread-id")).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should get thread context via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread",
          resourceId: "test-user",
          messages: [],
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadState = await act(async () => {
      return await result.current.getThreadContext("test-thread");
    });

    expect(threadState.id).toBe("test-thread");
    expect(threadState.messages).toEqual([]);
    expect(result.current.threads.has("test-thread")).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread",
    );
  });

  it("should update thread metadata via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread",
          metadata: { category: "test", priority: "high" },
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // First add the thread to local state
    act(() => {
      result.current.setCurrentThread("test-thread");
    });

    await act(async () => {
      await result.current.updateThreadMetadata("test-thread", {
        category: "test",
        priority: "high",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("should delete thread via API", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // First create a thread in local state
    (global.fetch as any).mockResolvedValueOnce({
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
    });

    await act(async () => {
      await result.current.createThread();
    });

    expect(result.current.threads.has("test-thread-id")).toBe(true);

    // Now delete it
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    await act(async () => {
      await result.current.deleteThread("test-thread-id");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread-id",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
    expect(result.current.threads.has("test-thread-id")).toBe(false);
  });

  it("should clear currentThread when deleting the active thread", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // Set current thread
    act(() => {
      result.current.setCurrentThread("test-thread");
    });

    expect(result.current.currentThread).toBe("test-thread");

    // Delete the current thread
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    await act(async () => {
      await result.current.deleteThread("test-thread");
    });

    expect(result.current.currentThread).toBeNull();
  });

  it("should throw error when thread deletion fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    await expect(
      act(async () => {
        await result.current.deleteThread("test-thread");
      }),
    ).rejects.toThrow("Failed to delete thread: 500");
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "test query",
      });
    });

    expect(searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });
});

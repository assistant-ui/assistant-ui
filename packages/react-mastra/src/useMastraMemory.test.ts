import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraMemory } from "./useMastraMemory";
import { MastraMemoryConfig, MastraMessage } from "./types";

// Mock Mastra memory API for testing
const mastraMemory = {
  search: vi.fn().mockResolvedValue([
    {
      content: "Previous conversation about cooking preferences",
      metadata: { source: "memory", type: "preference" },
      similarity: 0.9,
      threadId: "test-thread",
      timestamp: new Date().toISOString(),
    },
  ]),
  save: vi.fn().mockResolvedValue(undefined),
  getThread: vi.fn().mockResolvedValue({
    id: "test-thread",
    messages: [],
    interrupts: [],
    metadata: {},
    memory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
};

// Silence the unused variable warning since this is used by the implementation
void mastraMemory;

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

  const mockMessage: MastraMessage = {
    id: "test-message",
    type: "human",
    content: "Test message content",
    timestamp: new Date().toISOString(),
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

  it("should search memory with semantic similarity", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "cooking preferences",
        threadId: "test-thread",
      });
    });

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]?.similarity).toBeGreaterThan(0.8);
    expect(searchResults[0]?.content).toContain("Previous conversation about cooking preferences");
    expect(result.current.isSearching).toBe(false);
  });

  it("should save messages to persistent memory", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    await act(async () => {
      await result.current.saveToMemory("test-thread", [mockMessage]);
    });

    const thread = result.current.threads.get("test-thread");
    expect(thread).toBeDefined();
    expect(thread?.messages).toHaveLength(1);
    expect(thread?.messages[0]).toEqual(mockMessage);
    expect(thread?.updatedAt).toBeDefined();
  });

  it("should create new thread with generated ID", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadId = await act(async () => {
      return await result.current.createThread({ source: "test" });
    });

    expect(threadId).toBe("test-thread-id");
    expect(result.current.currentThread).toBe("test-thread-id");
    expect(result.current.threads.has("test-thread-id")).toBe(true);

    const thread = result.current.threads.get("test-thread-id");
    expect(thread?.metadata['source']).toBe("test");
  });

  it("should delete thread and update current thread", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // First create a thread
    await act(async () => {
      await result.current.createThread();
    });

    const createdThreadId = result.current.currentThread;
    expect(createdThreadId).toBeDefined();

    // Then delete it
    await act(async () => {
      if (createdThreadId) {
        await result.current.deleteThread(createdThreadId);
      }
    });

    if (createdThreadId) {
      expect(result.current.threads.has(createdThreadId)).toBe(false);
    }
    expect(result.current.currentThread).toBeNull();
  });

  it("should update thread metadata", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    await act(async () => {
      await result.current.createThread();
    });

    const threadId = result.current.currentThread;
    expect(threadId).toBeDefined();

    await act(async () => {
      await result.current.updateThreadMetadata(threadId!, {
        category: "test",
        priority: "high"
      });
    });

    const thread = result.current.threads.get(threadId!);
    expect(thread?.metadata['category']).toBe("test");
    expect(thread?.metadata['priority']).toBe("high");
    expect(thread?.updatedAt).toBeDefined();
  });

  it("should get thread context from memory API", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadState = await act(async () => {
      return await result.current.getThreadContext("test-thread");
    });

    expect(threadState.id).toBe("test-thread");
    expect(threadState.messages).toEqual([]);
    expect(threadState.interrupts).toEqual([]);
    expect(threadState.metadata).toEqual({});
    expect(threadState.memory).toEqual([]);
    expect(result.current.threads.has("test-thread")).toBe(true);
  });

  it("should handle concurrent search operations", async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // Start two searches concurrently
    const [search1, search2] = await act(async () => {
      return await Promise.all([
        result.current.searchMemory({ query: "test query 1" }),
        result.current.searchMemory({ query: "test query 2" }),
      ]);
    });

    expect(search1).toHaveLength(1);
    expect(search2).toHaveLength(1);
    expect(result.current.isSearching).toBe(false);
  });

  it("should use default config values in search", async () => {
    const configWithoutDefaults: MastraMemoryConfig = {
      storage: "postgresql",
    };

    const { result } = renderHook(() => useMastraMemory(configWithoutDefaults));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "test query",
      });
    });

    expect(searchResults).toHaveLength(1);
    expect(result.current.isSearching).toBe(false);
  });

  it("should switch current thread", () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    expect(result.current.currentThread).toBe("test-thread");

    act(() => {
      result.current.setCurrentThread("new-thread");
    });

    expect(result.current.currentThread).toBe("new-thread");
  });
});
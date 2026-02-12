// @vitest-environment jsdom

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockUseChat, mockCloud } = vi.hoisted(() => {
  const mockThreadsCreate = vi.fn().mockResolvedValue({ thread_id: "new-t-1" });

  const cloud = {
    threads: {
      create: mockThreadsCreate,
      list: vi.fn().mockResolvedValue({ threads: [] }),
      getById: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    },
    threadMessages: {
      list: vi.fn().mockResolvedValue([]),
      generateTitle: vi.fn().mockResolvedValue("title"),
    },
  };

  const useChat = vi.fn().mockReturnValue({
    messages: [],
    input: "",
    setInput: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    error: null,
    append: vi.fn(),
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    clearError: vi.fn(),
    resumeStream: vi.fn(),
    reload: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
    status: "ready",
  });

  return { mockUseChat: useChat, mockCloud: cloud };
});

vi.mock("assistant-cloud", () => ({
  AssistantCloud: vi.fn(() => mockCloud),
  CloudMessagePersistence: vi.fn(
    class {
      load = vi.fn().mockResolvedValue({ messages: [] });
      append = vi.fn().mockResolvedValue(undefined);
    },
  ),
  createFormattedPersistence: vi.fn(() => ({
    isPersisted: vi.fn().mockReturnValue(false),
    append: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({ messages: [] }),
  })),
}));

vi.mock("@ai-sdk/react", async () => {
  const { Chat } =
    await vi.importActual<typeof import("@ai-sdk/react")>("@ai-sdk/react");
  return {
    Chat,
    useChat: mockUseChat,
  };
});

vi.mock("ai", () => ({
  DefaultChatTransport: vi.fn(
    class {
      sendMessages = vi.fn();
      reconnectToStream = vi.fn();
    },
  ),
}));

import { useCloudChat } from "./useCloudChat";

describe("useCloudChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue({
      messages: [],
      input: "",
      setInput: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: null,
      append: vi.fn(),
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      clearError: vi.fn(),
      resumeStream: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
      setMessages: vi.fn(),
      status: "ready",
    });
  });

  it("does not crash on first render when creating initial chat", () => {
    const { result } = renderHook(() =>
      useCloudChat({ cloud: mockCloud as never }),
    );

    expect(result.current.threadStore).toBeDefined();
    expect(result.current.threadStore.cloud).toBe(mockCloud);
  });

  it("returns chat helpers from useChat", () => {
    const { result } = renderHook(() =>
      useCloudChat({ cloud: mockCloud as never }),
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe("ready");
    expect(typeof result.current.sendMessage).toBe("function");
  });

  it("passes activeChat to useChat", () => {
    renderHook(() => useCloudChat({ cloud: mockCloud as never }));

    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chat: expect.objectContaining({
          id: expect.any(String),
        }),
      }),
    );
  });

  it("selecting a thread triggers useChat with thread key", async () => {
    const threadStore = {
      cloud: mockCloud,
      threads: [],
      isLoading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(true),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      threadId: null as string | null,
      selectThread: vi.fn(),
      generateTitle: vi.fn().mockResolvedValue(null),
    };

    const { rerender } = renderHook(
      ({ tid }) => {
        threadStore.threadId = tid;
        return useCloudChat({ threads: threadStore as never });
      },
      { initialProps: { tid: null as string | null } },
    );

    await act(async () => {
      rerender({ tid: "thread-1" });
    });

    const lastCall = mockUseChat.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    expect(lastCall![0].chat).toBeDefined();
  });
});

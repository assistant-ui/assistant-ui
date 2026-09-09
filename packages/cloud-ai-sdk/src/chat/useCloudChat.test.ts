// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockUseChat, mockCloud, mockResolvedRemoteId } = vi.hoisted(() => {
  const mockThreadsCreate = vi.fn().mockResolvedValue({ thread_id: "new-t-1" });
  const resolvedRemoteId = vi.fn();

  const cloud = {
    threads: {
      create: mockThreadsCreate,
      list: vi.fn().mockResolvedValue({ threads: [] }),
      getById: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      messages: {
        feedback: vi.fn(),
      },
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

  return {
    mockUseChat: useChat,
    mockCloud: cloud,
    mockResolvedRemoteId: resolvedRemoteId,
  };
});

vi.mock("assistant-cloud", () => ({
  AssistantCloud: vi.fn(() => mockCloud),
  CloudMessagePersistence: vi.fn(
    class {
      load = vi.fn().mockResolvedValue({ messages: [] });
      append = vi.fn().mockResolvedValue(undefined);
      getResolvedRemoteId = mockResolvedRemoteId;
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

const createThreads = (cloud: typeof mockCloud, threadId: string | null) => ({
  cloud,
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
  threadId,
  selectThread: vi.fn(),
  generateTitle: vi.fn().mockResolvedValue(null),
});

describe("useCloudChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedRemoteId.mockReturnValue(undefined);
    mockCloud.threads.messages.feedback.mockResolvedValue({
      feedback_id: "feedback-1",
      type: "positive",
    });
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

  it("replaces cached chats when the cloud changes", () => {
    const threadsA = createThreads({ ...mockCloud }, "thread-1");
    const threadsB = createThreads({ ...mockCloud }, "thread-1");

    const { rerender } = renderHook(
      ({ threads }) => useCloudChat({ threads: threads as never }),
      { initialProps: { threads: threadsA } },
    );
    const chatA = mockUseChat.mock.calls.at(-1)?.[0].chat;

    rerender({ threads: threadsB });

    const chatB = mockUseChat.mock.calls.at(-1)?.[0].chat;
    expect(chatB).not.toBe(chatA);
  });

  it("sends feedback for the persisted cloud message in the active thread", async () => {
    mockResolvedRemoteId.mockReturnValue("remote-message-1");
    const threads = createThreads(mockCloud, "thread-1");
    const { result } = renderHook(() =>
      useCloudChat({ threads: threads as never }),
    );

    await expect(
      result.current.feedback("local-message-1", "positive"),
    ).resolves.toBeUndefined();

    expect(mockResolvedRemoteId).toHaveBeenCalledWith("local-message-1");
    expect(mockCloud.threads.messages.feedback).toHaveBeenCalledWith(
      "thread-1",
      "remote-message-1",
      { type: "positive" },
    );
  });

  it("rejects feedback for a message that has not persisted", async () => {
    const threads = createThreads(mockCloud, "thread-1");
    const { result } = renderHook(() =>
      useCloudChat({ threads: threads as never }),
    );

    await expect(
      result.current.feedback("local-message-1", "negative"),
    ).rejects.toThrow("Message is not persisted yet");
    expect(mockCloud.threads.messages.feedback).not.toHaveBeenCalled();
  });

  it("rejects feedback when there is no active thread", async () => {
    const threads = createThreads(mockCloud, null);
    const { result } = renderHook(() =>
      useCloudChat({ threads: threads as never }),
    );

    await expect(
      result.current.feedback("local-message-1", "positive"),
    ).rejects.toThrow("No active thread");
    expect(mockResolvedRemoteId).not.toHaveBeenCalled();
    expect(mockCloud.threads.messages.feedback).not.toHaveBeenCalled();
  });
});

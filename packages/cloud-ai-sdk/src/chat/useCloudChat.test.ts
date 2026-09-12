// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockUseChat,
  mockCloud,
  mockResolvedRemoteId,
  mockToolApprovalResponded,
} = vi.hoisted(() => {
  const mockThreadsCreate = vi.fn().mockResolvedValue({ thread_id: "new-t-1" });
  const resolvedRemoteId = vi.fn();
  const mockToolApprovalResponded = vi.fn();

  const cloud = {
    events: { track: vi.fn() },
    registerSdk: vi.fn(),
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
    mockToolApprovalResponded,
  };
});

vi.mock("assistant-cloud", () => ({
  AssistantCloud: vi.fn(() => mockCloud),
  CloudRunReporter: class {
    report = vi.fn().mockResolvedValue(undefined);
  },
  CloudEngagementReporter: class {
    runStarted = vi.fn();
    runStopped = vi.fn();
    messageSent = vi.fn();
    messageRegenerated = vi.fn();
    errorShown = vi.fn();
    toolApprovalResponded = mockToolApprovalResponded;
  },
  CloudMessagePersistence: vi.fn(
    class {
      load = vi.fn().mockResolvedValue({ messages: [] });
      append = vi.fn().mockResolvedValue(undefined);
      getResolvedRemoteId = mockResolvedRemoteId;
      getRemoteId = vi.fn((messageId: string) =>
        Promise.resolve(mockResolvedRemoteId(messageId)),
      );
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

import { CLOUD_AI_SDK_SDK } from "../sdkIdentity";
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

  describe("addToolApprovalResponse", () => {
    const approvalMessage = (approved?: boolean) => ({
      id: "local-message-1",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-delete",
          toolCallId: "tc-1",
          state:
            approved === undefined
              ? "approval-requested"
              : "approval-responded",
          input: {},
          approval: {
            id: "approval-1",
            ...(approved !== undefined && { approved }),
          },
        },
      ],
    });
    const args = { id: "approval-1", approved: true, reason: "private reason" };

    // Captures the live Chat the hook renders so the test can drive its state
    // the way the SDK does, instead of the render snapshot.
    const setup = (addToolApprovalResponse: ReturnType<typeof vi.fn>) => {
      const base = mockUseChat();
      let liveChat!: { messages: unknown[] };
      mockUseChat.mockImplementation(({ chat }: { chat: typeof liveChat }) => {
        liveChat = chat;
        return { ...base, addToolApprovalResponse };
      });
      mockResolvedRemoteId.mockReturnValue("remote-message-1");
      const threads = createThreads(mockCloud, "thread-1");
      const { result } = renderHook(() =>
        useCloudChat({ threads: threads as never }),
      );
      liveChat.messages = [approvalMessage()];
      return { result, liveChat };
    };

    it.each([true, false])(
      "reports the decision the SDK recorded (approved=%s), once",
      async (approved) => {
        let liveChat: { messages: unknown[] } | undefined;
        const addToolApprovalResponse = vi.fn(
          async ({ approved }: { approved: boolean }) => {
            const last = liveChat!.messages.at(-1) as ReturnType<
              typeof approvalMessage
            >;
            if (last.parts[0]!.state === "approval-requested")
              liveChat!.messages = [approvalMessage(approved)];
          },
        );
        const harness = setup(addToolApprovalResponse);
        liveChat = harness.liveChat;
        const decision = { ...args, approved };
        await harness.result.current.addToolApprovalResponse(decision);
        // A repeat before the next render: the SDK keeps the first answer.
        await harness.result.current.addToolApprovalResponse({
          ...args,
          approved: !approved,
        });
        expect(addToolApprovalResponse).toHaveBeenCalledTimes(2);
        expect(addToolApprovalResponse).toHaveBeenNthCalledWith(1, decision);
        // The shared reporter dedupes and resolves ids; the wrapper hands it
        // the decision the SDK recorded on the live last message.
        expect(mockToolApprovalResponded).toHaveBeenCalledExactlyOnceWith(
          "thread-1",
          { messageId: "local-message-1", approvalId: "approval-1", approved },
        );
      },
    );

    it("reports nothing when the SDK rejects the decision", async () => {
      const error = new Error("stale");
      const { result } = setup(vi.fn().mockRejectedValue(error));
      await expect(result.current.addToolApprovalResponse(args)).rejects.toBe(
        error,
      );
      expect(mockToolApprovalResponded).not.toHaveBeenCalled();
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

  it("registers the cloud AI SDK on an explicit cloud", () => {
    renderHook(() => useCloudChat({ cloud: mockCloud as never }));

    expect(mockCloud.registerSdk).toHaveBeenCalledWith(CLOUD_AI_SDK_SDK);
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

// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    isLoadingHistory: false,
    threadId: "thread-id",
    mainThreadId: "thread-id",
  };
  const subscribers = new Set<() => void>();
  const runtime = {
    thread: {
      getState: () => ({ isLoading: state.isLoadingHistory }),
      getModelContext: () => ({}),
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
    },
    threads: {
      mainItem: undefined,
    },
  };
  return {
    state,
    subscribers,
    runtime,
    useChat: vi.fn(),
    useAISDKRuntime: vi.fn(() => runtime),
    useCloudThreadListAdapter: vi.fn(() => null),
    useRemoteThreadListRuntime: vi.fn(
      ({ runtimeHook }: { runtimeHook: () => unknown }) => runtimeHook(),
    ),
    useAui: vi.fn(() => ({
      threadListItem: Object.assign(() => ({}), { source: undefined }),
    })),
    useAuiState: vi.fn(
      (
        selector: (state: {
          threadListItem: { id: string };
          threads: { mainThreadId: string };
        }) => unknown,
      ) =>
        selector({
          threadListItem: { id: state.threadId },
          threads: { mainThreadId: state.mainThreadId },
        }),
    ),
  };
});

vi.mock("@ai-sdk/react", () => ({
  useChat: mocks.useChat,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
  useRemoteThreadListRuntime: mocks.useRemoteThreadListRuntime,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: mocks.useAui,
  useAuiState: mocks.useAuiState,
}));

vi.mock("./useAISDKRuntime", () => ({
  useAISDKRuntime: mocks.useAISDKRuntime,
}));

import { AssistantChatTransport } from "./AssistantChatTransport";
import {
  createResumableSessionStorage,
  RESUMABLE_STREAM_ID_HEADER,
} from "../resumable";
import { useChatRuntime } from "./useChatRuntime";

const sendMessagesOptions = {
  trigger: "submit-message" as const,
  chatId: "thread-id",
  messageId: undefined,
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }],
  abortSignal: undefined,
};

describe("useChatRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.isLoadingHistory = false;
    mocks.state.threadId = "thread-id";
    mocks.state.mainThreadId = "thread-id";
    mocks.subscribers.clear();
    window.sessionStorage.clear();
  });

  it("waits for external history to load before resuming a stream", async () => {
    mocks.state.isLoadingHistory = true;
    const resumeStream = vi.fn().mockResolvedValue(undefined);
    mocks.useChat.mockReturnValue({ resumeStream });

    const transport = {
      getResumableAdapter: () => ({
        storage: {
          getStreamId: () => "stream-1",
          setStreamId: vi.fn(),
          clear: vi.fn(),
        },
        resumeApi: "/api/chat/resume",
      }),
    };

    renderHook(() => useChatRuntime({ transport: transport as never }));

    expect(resumeStream).not.toHaveBeenCalled();

    act(() => {
      mocks.state.isLoadingHistory = false;
      mocks.subscribers.forEach((callback) => callback());
    });

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(1));
  });

  it("resumes a stream id discovered after mount", async () => {
    let streamId: string | null = null;
    const storageSubscribers = new Set<() => void>();
    const resumeStream = vi.fn().mockResolvedValue(undefined);
    mocks.useChat.mockReturnValue({ resumeStream });

    const storage = {
      getStreamId: () => streamId,
      setStreamId: (id: string) => {
        streamId = id;
        storageSubscribers.forEach((callback) => callback());
      },
      clear: () => {
        streamId = null;
        storageSubscribers.forEach((callback) => callback());
      },
      subscribe: (callback: () => void) => {
        storageSubscribers.add(callback);
        return () => storageSubscribers.delete(callback);
      },
    };
    const transport = {
      getResumableAdapter: () => ({
        storage,
        resumeApi: "/api/chat/resume",
      }),
    };

    renderHook(() => useChatRuntime({ transport: transport as never }));

    expect(resumeStream).not.toHaveBeenCalled();

    act(() => storage.setStreamId("stream-1"));

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(1));

    act(() => storage.setStreamId("stream-1"));

    expect(resumeStream).toHaveBeenCalledTimes(1);

    act(() => storage.setStreamId("stream-2"));

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(2));

    act(() => storage.setStreamId("stream-1"));

    expect(resumeStream).toHaveBeenCalledTimes(2);
  });

  it("does not resume the same stored id again after a remount", async () => {
    const storage = createResumableSessionStorage({
      key: "remount-stream-id",
    });
    storage.setStreamId("stream-1", "thread-id");
    const resumeStream = vi.fn().mockResolvedValue(undefined);
    mocks.useChat.mockReturnValue({
      resumeStream,
      status: "ready",
    });
    const transport = {
      getResumableAdapter: () => ({
        storage,
        resumeApi: "/api/chat/resume",
      }),
    };

    const firstRuntime = renderHook(() =>
      useChatRuntime({ transport: transport as never }),
    );
    await waitFor(() => expect(resumeStream).toHaveBeenCalledOnce());

    firstRuntime.unmount();
    renderHook(() => useChatRuntime({ transport: transport as never }));

    expect(resumeStream).toHaveBeenCalledOnce();
  });

  it("does not resume a stream id written by an active send", async () => {
    const storage = createResumableSessionStorage({
      key: "active-send-stream-id",
    });
    const fetchMock = vi.fn(async () => {
      return new Response(
        new ReadableStream({ start: (controller) => controller.close() }),
        {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
          },
        },
      );
    });
    const transport = new AssistantChatTransport({
      fetch: fetchMock as never,
      resumable: {
        storage,
        resumeApi: "/api/chat/resume",
      },
    });
    const resumeStream = vi.fn(async () => {
      await transport.reconnectToStream({ chatId: "thread-id" });
    });
    const chatState = {
      resumeStream,
      status: "streaming",
    };
    mocks.useChat.mockImplementation(() => chatState);

    const { rerender } = renderHook(() => useChatRuntime({ transport }));

    await act(async () => {
      await transport.sendMessages(sendMessagesOptions as never);
    });

    await waitFor(() =>
      expect(storage.getStreamId("thread-id")).toBe("stream-1"),
    );

    chatState.status = "ready";
    rerender();

    expect(resumeStream).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not broadcast a stream id to another mounted thread", async () => {
    const storage = createResumableSessionStorage({
      key: "multi-thread-stream-id",
    });
    const transport = {
      getResumableAdapter: () => ({
        storage,
        resumeApi: "/api/chat/resume",
      }),
    };
    const threadA = {
      resumeStream: vi.fn().mockResolvedValue(undefined),
      status: "ready",
    };
    const threadB = {
      resumeStream: vi.fn().mockResolvedValue(undefined),
      status: "streaming",
    };
    mocks.useChat.mockImplementation(({ id }: { id: string }) =>
      id === "thread-a" ? threadA : threadB,
    );

    mocks.state.threadId = "thread-a";
    mocks.state.mainThreadId = "thread-a";
    renderHook(() => useChatRuntime({ transport: transport as never }));

    mocks.state.threadId = "thread-b";
    mocks.state.mainThreadId = "thread-b";
    const threadBHook = renderHook(() =>
      useChatRuntime({ transport: transport as never }),
    );

    act(() => storage.setStreamId("stream-b", "thread-b"));

    threadB.status = "ready";
    threadBHook.rerender();

    expect(threadA.resumeStream).not.toHaveBeenCalled();
    expect(threadB.resumeStream).not.toHaveBeenCalled();
  });

  it("resumes a persisted stream after reload changes the local thread id", async () => {
    const storageKey = "reload-stream-id";
    createResumableSessionStorage({ key: storageKey }).setStreamId(
      "stream-a",
      "__LOCALID_before_reload",
    );
    const reloadedStorage = createResumableSessionStorage({ key: storageKey });
    const backgroundThread = {
      resumeStream: vi.fn().mockResolvedValue(undefined),
      status: "ready",
    };
    const mainThread = {
      resumeStream: vi.fn().mockResolvedValue(undefined),
      status: "ready",
    };
    mocks.useChat.mockImplementation(({ id }: { id: string }) =>
      id === "__LOCALID_background" ? backgroundThread : mainThread,
    );
    const transport = {
      getResumableAdapter: () => ({
        storage: reloadedStorage,
        resumeApi: "/api/chat/resume",
      }),
    };

    mocks.state.threadId = "__LOCALID_background";
    mocks.state.mainThreadId = "__LOCALID_after_reload";
    renderHook(() => useChatRuntime({ transport: transport as never }));

    mocks.state.threadId = "__LOCALID_after_reload";
    renderHook(() => useChatRuntime({ transport: transport as never }));

    expect(backgroundThread.resumeStream).not.toHaveBeenCalled();
    await waitFor(() => expect(mainThread.resumeStream).toHaveBeenCalledOnce());
  });

  it("observes resumable storage from a replacement transport", async () => {
    const resumeStream = vi.fn().mockResolvedValue(undefined);
    mocks.useChat.mockReturnValue({
      resumeStream,
      status: "ready",
    });
    const storageA = {
      getStreamId: (): string | null => null,
      setStreamId: vi.fn(),
      clear: vi.fn(),
    };
    const storageB = {
      getStreamId: (): string | null => "stream-b",
      setStreamId: vi.fn(),
      clear: vi.fn(),
    };
    const transportA = {
      getResumableAdapter: () => ({
        storage: storageA,
        resumeApi: "/api/chat/resume",
      }),
    };
    const transportB = {
      getResumableAdapter: () => ({
        storage: storageB,
        resumeApi: "/api/chat/resume",
      }),
    };

    const { rerender } = renderHook(
      ({ transport }) => useChatRuntime({ transport: transport as never }),
      { initialProps: { transport: transportA } },
    );

    expect(resumeStream).not.toHaveBeenCalled();

    rerender({ transport: transportB });

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(1));
  });

  it("does not clear a newer stream id when an older resume fails", async () => {
    let streamId: string | null = "stream-1";
    const storageSubscribers = new Set<() => void>();
    const clear = vi.fn(() => {
      streamId = null;
      storageSubscribers.forEach((callback) => callback());
    });
    const storage = {
      getStreamId: () => streamId,
      setStreamId: (id: string) => {
        streamId = id;
        storageSubscribers.forEach((callback) => callback());
      },
      clear,
      subscribe: (callback: () => void) => {
        storageSubscribers.add(callback);
        return () => storageSubscribers.delete(callback);
      },
    };
    const error = new Error("resume failed");
    let rejectFirstResume: ((error: Error) => void) | undefined;
    const resumeStream = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirstResume = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const onResumeError = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.useChat.mockReturnValue({
      resumeStream,
      status: "ready",
    });

    renderHook(() =>
      useChatRuntime({
        transport: {
          getResumableAdapter: () => ({
            storage,
            resumeApi: "/api/chat/resume",
          }),
        } as never,
        onResumeError,
      }),
    );

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(1));

    act(() => storage.setStreamId("stream-2"));

    await waitFor(() => expect(resumeStream).toHaveBeenCalledTimes(2));

    act(() => rejectFirstResume?.(error));

    await waitFor(() => expect(onResumeError).toHaveBeenCalledWith(error));
    expect(storage.getStreamId()).toBe("stream-2");
    expect(clear).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("calls onResumeError when automatic resumable stream resume fails", async () => {
    const error = new Error("resume failed");
    const resumeStream = vi.fn().mockRejectedValue(error);
    const clear = vi.fn();
    const onResumeError = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.useChat.mockReturnValue({
      resumeStream,
    });

    const transport = {
      getResumableAdapter: () => ({
        storage: {
          getStreamId: () => "stream-1",
          setStreamId: vi.fn(),
          clear,
        },
        resumeApi: "/api/chat/resume",
      }),
    };

    renderHook(() =>
      useChatRuntime({
        transport: transport as never,
        onResumeError,
      }),
    );

    await waitFor(() => {
      expect(onResumeError).toHaveBeenCalledWith(error);
    });
    expect(resumeStream).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(onResumeError.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0]!,
    );
    expect(warn).toHaveBeenCalledWith(
      "[assistant-ui] resumable: resume failed",
      error,
    );
    warn.mockRestore();
  });

  it("clears resumable stream storage when onResumeError throws", async () => {
    const error = new Error("resume failed");
    const callbackError = new Error("callback failed");
    const resumeStream = vi.fn().mockRejectedValue(error);
    const clear = vi.fn();
    const onResumeError = vi.fn(() => {
      throw callbackError;
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.useChat.mockReturnValue({
      resumeStream,
    });

    const transport = {
      getResumableAdapter: () => ({
        storage: {
          getStreamId: () => "stream-1",
          setStreamId: vi.fn(),
          clear,
        },
        resumeApi: "/api/chat/resume",
      }),
    };

    renderHook(() =>
      useChatRuntime({
        transport: transport as never,
        onResumeError,
      }),
    );

    await waitFor(() => {
      expect(clear).toHaveBeenCalledTimes(1);
    });
    expect(onResumeError).toHaveBeenCalledWith(error);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] resumable: onResumeError callback failed",
      callbackError,
    );
    warn.mockRestore();
    consoleError.mockRestore();
  });
});

// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { isLoadingHistory: false };
  const subscribers = new Set<() => void>();
  const runtime = {
    thread: {
      getState: () => ({ isLoading: state.isLoadingHistory }),
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
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
    useAuiState: vi.fn(() => "thread-id"),
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
import { useChatRuntime } from "./useChatRuntime";

describe("useChatRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.isLoadingHistory = false;
    mocks.subscribers.clear();
    mocks.useChat.mockReturnValue({});
  });

  it("keeps the default transport instance across rerenders", () => {
    const setRuntime = vi.spyOn(AssistantChatTransport.prototype, "setRuntime");

    const { rerender } = renderHook(() => useChatRuntime());
    const dynamicTransport = mocks.useChat.mock.calls[0]![0]
      .transport as AssistantChatTransport<UIMessage>;

    setRuntime.mockClear();
    dynamicTransport.setRuntime(mocks.runtime as never);
    const initialTransport = setRuntime.mock.contexts[0];
    expect(initialTransport).toBeInstanceOf(AssistantChatTransport);

    rerender();

    setRuntime.mockClear();
    dynamicTransport.setRuntime(mocks.runtime as never);
    expect(setRuntime.mock.contexts[0]).toBe(initialTransport);
  });

  it("wires a replacement AssistantChatTransport", () => {
    const firstTransport = new AssistantChatTransport();
    const secondTransport = new AssistantChatTransport();
    const firstSetRuntime = vi.spyOn(firstTransport, "setRuntime");
    const secondSetRuntime = vi.spyOn(secondTransport, "setRuntime");

    const { rerender } = renderHook(
      ({ transport }) => useChatRuntime({ transport }),
      {
        initialProps: { transport: firstTransport },
      },
    );
    rerender({ transport: secondTransport });

    expect(firstSetRuntime).toHaveBeenCalledWith(mocks.runtime);
    expect(secondSetRuntime).toHaveBeenCalledWith(mocks.runtime);
  });

  it("supports switching from AssistantChatTransport to a custom transport", () => {
    const assistantTransport = new AssistantChatTransport();
    const customTransport = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn(),
    };

    const { rerender } = renderHook(
      ({ transport }) => useChatRuntime({ transport: transport as never }),
      {
        initialProps: { transport: assistantTransport as never },
      },
    );

    rerender({ transport: customTransport as never });
    expect(() =>
      rerender({ transport: customTransport as never }),
    ).not.toThrow();
  });

  it("wires AssistantChatTransport after switching from a custom transport", () => {
    const customTransport = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn(),
    };
    const assistantTransport = new AssistantChatTransport();
    const setRuntime = vi.spyOn(assistantTransport, "setRuntime");

    const { rerender } = renderHook(
      ({ transport }) => useChatRuntime({ transport: transport as never }),
      {
        initialProps: { transport: customTransport as never },
      },
    );
    rerender({ transport: assistantTransport as never });

    expect(setRuntime).toHaveBeenCalledWith(mocks.runtime);
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
      "[assistant-ui] resumable: resume failed; clearing stored stream id",
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

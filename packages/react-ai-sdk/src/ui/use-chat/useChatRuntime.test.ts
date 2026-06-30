// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const runtime = {};
  return {
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

import { useChatRuntime } from "./useChatRuntime";

describe("useChatRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(warn).toHaveBeenCalledWith(
      "[assistant-ui] resumable: resume failed; clearing stored stream id",
      error,
    );
    warn.mockRestore();
  });
});

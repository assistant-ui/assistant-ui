// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { useChat } from "@ai-sdk/react";
import type { AssistantRuntime } from "@assistant-ui/react";

const mockUseChat = vi.fn();
const mockUseAuiState = vi.fn();
const mockUseAISDKRuntime = vi.fn();
const mockUseCloudThreadListAdapter = vi.fn();
const mockUseRemoteThreadListRuntime = vi.fn();

vi.mock("@ai-sdk/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ai-sdk/react")>();
  return {
    ...actual,
    useChat: (...args: unknown[]) => mockUseChat(...args),
  };
});

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...actual,
    unstable_useCloudThreadListAdapter: (...args: unknown[]) =>
      mockUseCloudThreadListAdapter(...args),
    unstable_useRemoteThreadListRuntime: (...args: unknown[]) =>
      mockUseRemoteThreadListRuntime(...args),
    useAuiState: (...args: unknown[]) => mockUseAuiState(...args),
  };
});

vi.mock("./useAISDKRuntime", async () => {
  const actual =
    await vi.importActual<typeof import("./useAISDKRuntime")>(
      "./useAISDKRuntime",
    );
  return {
    ...actual,
    useAISDKRuntime: (...args: unknown[]) => mockUseAISDKRuntime(...args),
  };
});

import { useChatRuntime } from "./useChatRuntime";

const createMockChatHelpers = (): ReturnType<typeof useChat> =>
  ({
    status: "ready",
    messages: [],
    error: null,
    setMessages: vi.fn(),
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    addToolResult: vi.fn(),
    addToolOutput: vi.fn(),
    stop: vi.fn(),
  }) as unknown as ReturnType<typeof useChat>;

describe("useChatRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockRuntime = { __type: "runtime" } as AssistantRuntime;
    const mockChatHelpers = createMockChatHelpers();

    mockUseAISDKRuntime.mockReturnValue(mockRuntime);
    mockUseChat.mockReturnValue(mockChatHelpers);
    mockUseCloudThreadListAdapter.mockReturnValue({ __type: "thread-list" });
    mockUseRemoteThreadListRuntime.mockImplementation(({ runtimeHook }) =>
      runtimeHook(),
    );
    mockUseAuiState.mockImplementation((selector) =>
      selector({ threadListItem: { id: "thread_1" } }),
    );
  });

  it("threads component handlers through useChatRuntime to useAISDKRuntime", () => {
    const onComponentInvoke = vi.fn();
    const onComponentEmit = vi.fn();
    const toCreateMessage = vi.fn();
    const transport = { sendMessages: vi.fn() };
    const historyAdapter = { __type: "history-adapter" };

    const { result } = renderHook(() =>
      useChatRuntime({
        transport: transport as never,
        adapters: { history: historyAdapter as never },
        toCreateMessage,
        cancelPendingToolCallsOnSend: false,
        onComponentInvoke,
        onComponentEmit,
      }),
    );

    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "thread_1",
      }),
    );

    expect(mockUseAISDKRuntime).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        adapters: expect.objectContaining({ history: historyAdapter }),
        toCreateMessage,
        cancelPendingToolCallsOnSend: false,
        onComponentInvoke,
        onComponentEmit,
      }),
    );

    expect(result.current).toEqual({ __type: "runtime" });
  });
});

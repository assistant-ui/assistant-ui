// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import type { ThreadHistoryAdapter } from "@assistant-ui/core";
import type { ChatTransport, UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { useAISDKRuntime } from "./useAISDKRuntime";

describe("useAISDKRuntime external history", () => {
  it("prepares a new thread's history once while the host re-renders", () => {
    const pin = vi.fn();
    const history = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        pin,
        load: vi.fn(),
        append: vi.fn(),
      }),
    } as unknown as ThreadHistoryAdapter;
    const transport: ChatTransport<UIMessage> = {
      sendMessages: vi.fn(),
      reconnectToStream: async () => null,
    };

    const { result, rerender } = renderHook(() =>
      useAISDKRuntime(useChat({ id: "new-thread", transport }), {
        adapters: { history },
      }),
    );
    rerender();
    rerender();

    expect(pin).toHaveBeenCalledOnce();
    expect(result.current.thread.getState().isLoading).toBe(false);
  });
});

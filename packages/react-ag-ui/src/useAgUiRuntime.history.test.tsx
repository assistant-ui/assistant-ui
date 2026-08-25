// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ThreadHistoryAdapter } from "@assistant-ui/core";
import type { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";

const agent = { runAgent: vi.fn(), abortRun: vi.fn() } as unknown as HttpAgent;

function createHistory(): ThreadHistoryAdapter {
  return {
    load: vi.fn().mockResolvedValue({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }),
    append: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => {
  cleanup();
});

describe("useAgUiRuntime history", () => {
  it("loads a history adapter that arrives on a later render", async () => {
    const history = createHistory();
    const { result, rerender } = renderHook(
      ({ history }: { history?: ThreadHistoryAdapter }) =>
        useAgUiRuntime({ agent, adapters: history ? { history } : {} }),
      { initialProps: {} },
    );

    await waitFor(() =>
      expect(result.current.thread.getState().isLoading).toBe(false),
    );
    expect(history.load).not.toHaveBeenCalled();
    expect(result.current.thread.getState().messages).toEqual([]);

    rerender({ history });

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(["restored"]),
    );
    expect(history.load).toHaveBeenCalledOnce();
  });

  it("loads once when the adapter is present from the first render", async () => {
    const history = createHistory();
    const { result, rerender } = renderHook(() =>
      useAgUiRuntime({ agent, adapters: { history } }),
    );

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(["restored"]),
    );
    rerender();
    rerender();
    expect(history.load).toHaveBeenCalledOnce();
  });
});

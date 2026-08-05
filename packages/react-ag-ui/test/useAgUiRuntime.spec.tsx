// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/core";
import type { HttpAgent } from "@ag-ui/client";
import { describe, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "../src/useAgUiRuntime";

const storedMessage = (id: string, text: string): ThreadMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
  createdAt: new Date(),
  metadata: { custom: {} },
});

describe("useAgUiRuntime", () => {
  it("clears removed history and loads a newly added unkeyed adapter", async () => {
    const agent = { runAgent: vi.fn() } as unknown as HttpAgent;
    const firstHistory: ThreadHistoryAdapter = {
      key: "workspace-a",
      load: vi.fn().mockResolvedValue({
        headId: "message-a",
        messages: [
          {
            parentId: null,
            message: storedMessage("message-a", "workspace a"),
          },
        ],
      }),
      append: vi.fn().mockResolvedValue(undefined),
    };
    const secondHistory: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "message-b",
        messages: [
          {
            parentId: null,
            message: storedMessage("message-b", "workspace b"),
          },
        ],
      }),
      append: vi.fn().mockResolvedValue(undefined),
    };
    const { result, rerender } = renderHook(
      ({ history }: { history: ThreadHistoryAdapter | undefined }) =>
        useAgUiRuntime({
          agent,
          adapters: history ? { history } : {},
        }),
      {
        initialProps: {
          history: firstHistory as ThreadHistoryAdapter | undefined,
        },
      },
    );

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((message) => message.id),
      ).toEqual(["message-a"]),
    );

    rerender({ history: undefined });

    await waitFor(() =>
      expect(result.current.thread.getState().messages).toEqual([]),
    );

    rerender({ history: secondHistory });

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((message) => message.id),
      ).toEqual(["message-b"]),
    );
    expect(firstHistory.load).toHaveBeenCalledOnce();
    expect(secondHistory.load).toHaveBeenCalledOnce();
  });
});

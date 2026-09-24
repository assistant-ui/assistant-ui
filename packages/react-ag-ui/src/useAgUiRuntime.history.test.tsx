// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type {
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
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

  it("records a settled tool interaction through the message part runtime", async () => {
    const assistant: ThreadAssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      createdAt: new Date(0),
      status: { type: "complete", reason: "unknown" },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "present",
          args: {},
          argsText: "{}",
          result: {},
        },
      ],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    const update = vi.fn(async () => {});
    const history: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: assistant.id,
        messages: [{ parentId: null, message: assistant }],
      }),
      append: vi.fn().mockResolvedValue(undefined),
      update,
    };
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, adapters: { history } }),
    );

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((message) => message.id),
      ).toEqual([assistant.id]),
    );
    const part = result.current.thread
      .getMessageById(assistant.id)
      .getMessagePartByToolCallId("call-1");
    const recordInteraction = part.unstable_recordInteraction;
    expect(recordInteraction).toBeDefined();

    await act(async () => {
      await recordInteraction!({
        type: "action",
        payload: { action: "confirm" },
      });
    });

    expect(part.getState()).toMatchObject({
      unstable_interactions: {
        entries: [
          {
            type: "action",
            payload: { action: "confirm" },
          },
        ],
      },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: null,
        message: expect.objectContaining({
          id: assistant.id,
          content: [
            expect.objectContaining({
              toolCallId: "call-1",
              unstable_interactions: expect.objectContaining({
                entries: [
                  expect.objectContaining({
                    type: "action",
                    payload: { action: "confirm" },
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    );
  });
});

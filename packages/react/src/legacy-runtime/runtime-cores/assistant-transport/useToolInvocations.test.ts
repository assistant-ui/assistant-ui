// @vitest-environment jsdom

import type { ThreadAssistantMessage } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantTransportState, ToolExecutionStatus } from "./types";
import { useToolInvocations } from "./useToolInvocations";

const createState = (
  messages: ThreadAssistantMessage[],
): AssistantTransportState => ({
  messages,
  isRunning: true,
});

const createAssistantMessage = (
  argsText: string,
  args: Record<string, unknown>,
): ThreadAssistantMessage => ({
  id: "m-1",
  role: "assistant",
  createdAt: new Date(),
  status: { type: "requires-action", reason: "tool-calls" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
  content: [
    {
      type: "tool-call",
      toolCallId: "tool-1",
      toolName: "weatherSearch",
      args,
      argsText,
    },
  ],
});

describe("useToolInvocations", () => {
  it("does not crash when tool argsText rewrites a previously streamed value", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const getTools = () => ({
      weatherSearch: {
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();

    const { rerender } = renderHook(
      ({ state }: { state: AssistantTransportState }) =>
        useToolInvocations({
          state,
          getTools,
          onResult,
          setToolStatuses,
        }),
      {
        initialProps: {
          state: createState([]),
        },
      },
    );

    expect(() => {
      act(() => {
        rerender({
          state: createState([
            createAssistantMessage('{"query":"London","longitude":0', {
              query: "London",
              longitude: 0,
            }),
          ]),
        });
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        rerender({
          state: createState([
            createAssistantMessage('{"query":"London","longitude":-0.125', {
              query: "London",
              longitude: -0.125,
            }),
          ]),
        });
      });
    }).not.toThrow();

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"query":"London","longitude":-0.125,"latitude":51.5072}',
            { query: "London", longitude: -0.125, latitude: 51.5072 },
          ),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    expect(execute).toHaveBeenCalledWith(
      {
        query: "London",
        longitude: -0.125,
        latitude: 51.5072,
      },
      expect.objectContaining({ toolCallId: "tool-1" }),
    );

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "add-tool-result",
        toolCallId: "tool-1",
        toolName: "weatherSearch",
      }),
    );
  });

  it("keeps logical toolCallId mapping through reset while abort settles", async () => {
    const execute = vi.fn(
      async () =>
        await new Promise(() => {
          // never resolves: reset() should cancel this call
        }),
    );
    const getTools = () => ({
      weatherSearch: {
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();

    let statuses: Record<string, ToolExecutionStatus> = {};
    const setToolStatuses = vi.fn(
      (
        updater:
          | Record<string, ToolExecutionStatus>
          | ((
              prev: Record<string, ToolExecutionStatus>,
            ) => Record<string, ToolExecutionStatus>),
      ) => {
        statuses =
          typeof updater === "function" ? updater(statuses) : { ...updater };
      },
    );

    const { result, rerender } = renderHook(
      ({ state }: { state: AssistantTransportState }) =>
        useToolInvocations({
          state,
          getTools,
          onResult,
          setToolStatuses,
        }),
      {
        initialProps: {
          state: createState([]),
        },
      },
    );

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage('{"query":"London","longitude":0', {
            query: "London",
            longitude: 0,
          }),
        ]),
      });
    });

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage('{"query":"London","longitude":-0.125', {
            query: "London",
            longitude: -0.125,
          }),
        ]),
      });
    });

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"query":"London","longitude":-0.125,"latitude":51.5072}',
            { query: "London", longitude: -0.125, latitude: 51.5072 },
          ),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(statuses["tool-1"]).toEqual({ type: "executing" });
    });

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(statuses).toEqual({});
    });
    expect(Object.keys(statuses)).not.toContain("tool-1:rewrite:0");
  });
});

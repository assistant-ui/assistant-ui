// @vitest-environment jsdom

import type { ThreadAssistantMessage } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantTransportState } from "./types";
import {
  type ToolExecutionStatus,
  useToolInvocations,
} from "./useToolInvocations";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";

const createState = (
  messages: ThreadAssistantMessage[],
  isRunning: boolean = true,
): AssistantTransportState => ({
  messages,
  isRunning,
});

const createAssistantMessage = (
  argsText: string,
  args: Record<string, unknown>,
  options?: {
    result?: ReadonlyJSONValue;
    isError?: boolean;
    toolCallId?: string;
    toolName?: string;
    nestedMessages?: ThreadAssistantMessage[];
  },
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
      toolCallId: options?.toolCallId ?? "tool-1",
      toolName: options?.toolName ?? "weatherSearch",
      args: args as ReadonlyJSONObject,
      argsText,
      ...(options?.result !== undefined && { result: options.result }),
      ...(options?.isError !== undefined && { isError: options.isError }),
      ...(options?.nestedMessages && { messages: options.nestedMessages }),
    },
  ],
});

describe("useToolInvocations", () => {
  it("does not crash when tool argsText rewrites a previously streamed value", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
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
        parameters: { type: "object", properties: {} },
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

  it("does not execute tool calls loaded asynchronously with existing results", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
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

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"query":"London"}',
            { query: "London" },
            { result: { source: "history" } },
          ),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
    });
  });

  it("does not re-execute asynchronously loaded resolved tool calls after reset", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();

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
          createAssistantMessage('{"query":"London"}', { query: "London" }),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.reset();
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      rerender({
        state: createState([]),
      });
    });

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"query":"London"}',
            { query: "London" },
            { result: { source: "history" } },
          ),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
      expect(onResult).toHaveBeenCalledTimes(1);
    });
  });

  it("still processes nested unresolved tool calls when the parent tool call is already resolved", async () => {
    const executeParent = vi.fn(async () => ({ scope: "parent" }));
    const executeChild = vi.fn(async () => ({ scope: "child" }));
    const getTools = () => ({
      resolvedOnly: {
        parameters: { type: "object", properties: {} },
        execute: executeParent,
      } satisfies Tool,
      childTool: {
        parameters: { type: "object", properties: {} },
        execute: executeChild,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();

    const nestedMessage = createAssistantMessage(
      '{"query":"nested"}',
      { query: "nested" },
      {
        toolCallId: "tool-child",
        toolName: "childTool",
      },
    );

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

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"query":"parent"}',
            { query: "parent" },
            {
              result: { source: "history" },
              toolName: "resolvedOnly",
              nestedMessages: [nestedMessage],
            },
          ),
        ]),
      });
    });

    await waitFor(() => {
      expect(executeParent).not.toHaveBeenCalled();
      expect(executeChild).toHaveBeenCalledTimes(1);
    });
  });

  it("does not close args stream early for non-executable tool snapshots", () => {
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
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

      act(() => {
        rerender({
          state: createState([createAssistantMessage("{}", {})]),
        });
      });

      act(() => {
        rerender({
          state: createState([
            createAssistantMessage('{"title":"Weekly"', {
              title: "Weekly",
            }),
          ]),
        });
      });

      act(() => {
        rerender({
          state: createState([
            createAssistantMessage('{"title":"Weekly","columns":["name"]}', {
              title: "Weekly",
              columns: ["name"],
            }),
          ]),
        });
      });

      expect(warnSpy).not.toHaveBeenCalledWith(
        "argsText updated after controller was closed:",
        expect.anything(),
      );
      expect(warnSpy).not.toHaveBeenCalledWith(
        "argsText updated after controller was closed, restarting tool args stream:",
        expect.anything(),
      );
      expect(onResult).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("closes non-executable complete args stream after run settles", () => {
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
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

      act(() => {
        rerender({
          state: createState(
            [
              createAssistantMessage('{"title":"Weekly"}', {
                title: "Weekly",
              }),
            ],
            true,
          ),
        });
      });

      act(() => {
        rerender({
          state: createState(
            [
              createAssistantMessage('{"title":"Weekly"}', {
                title: "Weekly",
              }),
            ],
            false,
          ),
        });
      });

      act(() => {
        rerender({
          state: createState(
            [
              createAssistantMessage('{"title":"Weekly","columns":["name"]}', {
                title: "Weekly",
                columns: ["name"],
              }),
            ],
            false,
          ),
        });
      });

      expect(warnSpy).toHaveBeenCalledWith(
        "argsText updated after controller was closed, restarting tool args stream:",
        expect.objectContaining({
          previous: '{"title":"Weekly"}',
          next: '{"title":"Weekly","columns":["name"]}',
        }),
      );
      expect(onResult).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("handles backend result when equivalent complete argsText reorders keys", async () => {
    let resolveExecute: ((value: unknown) => void) | undefined;
    const execute = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveExecute = resolve;
        }),
    );
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
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

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage('{"a":1,"b":2}', {
            a: 1,
            b: 2,
          }),
        ]),
      });
    });

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    act(() => {
      rerender({
        state: createState([
          createAssistantMessage(
            '{"b":2,"a":1}',
            {
              a: 1,
              b: 2,
            },
            {
              result: { source: "backend" },
            },
          ),
        ]),
      });
    });

    await act(async () => {
      resolveExecute?.({ source: "client" });
    });

    await waitFor(() => {
      expect(onResult).not.toHaveBeenCalled();
    });
  });
});

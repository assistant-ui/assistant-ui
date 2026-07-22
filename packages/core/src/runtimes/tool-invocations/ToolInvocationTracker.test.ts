import type { Tool } from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import {
  ToolInvocationTracker,
  type ToolExecutionStatus,
  type ToolInvocationTrackerSnapshot,
} from "./ToolInvocationTracker";
import type {
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";

async function waitFor(
  predicate: () => unknown,
  timeoutMs = 500,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await predicate();
      return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 5));
  }
  await predicate();
}

const createState = (
  messages: ThreadAssistantMessage[],
  isRunning: boolean = true,
): ToolInvocationTrackerSnapshot => ({
  messages: messages as readonly ThreadMessage[],
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

describe("ToolInvocationTracker", () => {
  it("does not crash and does not re-fire streamCall when tool argsText regresses mid-stream", async () => {
    // The tracker holds the contract: streamCall fires exactly once per
    // logical toolCallId, no matter how the host's argsText mutates. Under
    // the legacy restart behavior, this scenario caused a second streamCall
    // / execute invocation against a synthetic rewrite stream id. With the
    // new contract, the controller keeps whatever prefix already streamed;
    // a regressed (non-prefix) argsText is observed but not surfaced through
    // a re-invocation. EDGE_CASES.md A.2 captures the trade-off; the events
    // API follow-up will expose the divergence to consumers that opt in.
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(getTools, {
        onResult,
        onStatusesChange,
      });
      tracker.setState(createState([]));

      expect(() => {
        tracker.setState(
          createState([
            createAssistantMessage('{"query":"London","longitude":0', {
              query: "London",
              longitude: 0,
            }),
          ]),
        );
      }).not.toThrow();

      expect(() => {
        tracker.setState(
          createState([
            createAssistantMessage('{"query":"London","longitude":-0.125', {
              query: "London",
              longitude: -0.125,
            }),
          ]),
        );
      }).not.toThrow();

      tracker.setState(
        createState([
          createAssistantMessage(
            '{"query":"London","longitude":-0.125,"latitude":51.5072}',
            { query: "London", longitude: -0.125, latitude: 51.5072 },
          ),
        ]),
      );

      // Exactly-once contract: streamCall fired once (on first observation),
      // no rewrite or re-fire despite two subsequent non-prefix regressions.
      await waitFor(() => {
        expect(streamCall).toHaveBeenCalledTimes(1);
      });

      // The regression was detected and logged (non-prod only).
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("regressed mid-stream"),
        expect.objectContaining({ toolCallId: "tool-1" }),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("clears executing status under the logical toolCallId when reset() lands while execute is pending", async () => {
    // Tests the F.1 lifecycle: reset() aborts in-flight execute() invocations
    // and clears their executing status. The status key is the logical
    // toolCallId (no synthetic stream ids exist under the new
    // exactly-once-per-toolCallId contract).
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
    const onStatusesChange = (s: ReadonlyMap<string, ToolExecutionStatus>) => {
      statuses = Object.fromEntries(s);
    };

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    // Single monotonic snapshot growing to a complete value triggers execute.
    tracker.setState(
      createState([
        createAssistantMessage('{"query":"London"', { query: "London" }),
      ]),
    );

    tracker.setState(
      createState([
        createAssistantMessage('{"query":"London"}', { query: "London" }),
      ]),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(statuses["tool-1"]).toEqual({ type: "executing" });
    });

    tracker.reset();

    await waitFor(() => {
      expect(statuses).toEqual({});
    });
    // No legacy `:rewrite:N` stream ids leak into the status map.
    expect(Object.keys(statuses).some((k) => k.includes(":rewrite:"))).toBe(
      false,
    );
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
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

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
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage('{"query":"London"}', { query: "London" }),
      ]),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    tracker.reset();

    await Promise.resolve();

    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

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
    const onStatusesChange = () => {};

    const nestedMessage = createAssistantMessage(
      '{"query":"nested"}',
      { query: "nested" },
      {
        toolCallId: "tool-child",
        toolName: "childTool",
      },
    );

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
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
    );

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
    const onStatusesChange = () => {};
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(getTools, {
        onResult,
        onStatusesChange,
      });
      tracker.setState(createState([]));

      tracker.setState(createState([createAssistantMessage("{}", {})]));

      tracker.setState(
        createState([
          createAssistantMessage('{"title":"Weekly"', {
            title: "Weekly",
          }),
        ]),
      );

      tracker.setState(
        createState([
          createAssistantMessage('{"title":"Weekly","columns":["name"]}', {
            title: "Weekly",
            columns: ["name"],
          }),
        ]),
      );

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
    const onStatusesChange = () => {};
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(getTools, {
        onResult,
        onStatusesChange,
      });
      tracker.setState(createState([]));

      tracker.setState(
        createState(
          [
            createAssistantMessage('{"title":"Weekly"}', {
              title: "Weekly",
            }),
          ],
          true,
        ),
      );

      tracker.setState(
        createState(
          [
            createAssistantMessage('{"title":"Weekly"}', {
              title: "Weekly",
            }),
          ],
          false,
        ),
      );

      tracker.setState(
        createState(
          [
            createAssistantMessage('{"title":"Weekly","columns":["name"]}', {
              title: "Weekly",
              columns: ["name"],
            }),
          ],
          false,
        ),
      );

      // Under the exactly-once-per-toolCallId contract, an argsText change
      // after first completion is logged but does not restart the stream.
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("changed after first completion"),
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
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage('{"a":1,"b":2}', {
          a: 1,
          b: 2,
        }),
      ]),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    tracker.setState(
      createState([
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
    );

    resolveExecute?.({ source: "client" });
    await Promise.resolve();

    await waitFor(() => {
      expect(onResult).not.toHaveBeenCalled();
    });
  });

  it("fires streamCall for already-resolved tool calls loaded after the initial snapshot", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChangeFn = vi.fn();

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: onStatusesChangeFn,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    const [reader] = streamCall.mock.calls[0]!;
    await expect(reader.args.get("query")).resolves.toBe("London");
    const response = await reader.response.get();
    expect(response.result).toEqual({ source: "history" });

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(onStatusesChangeFn).not.toHaveBeenCalled();
  });

  it("does not fire streamCall for tool calls present in the initial snapshot", async () => {
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    // The original test simulated initialProps via renderHook. Here, the
    // "initial snapshot" semantics come from `_pendingRestore` being true
    // on the very first setState. To match, we use a fresh tracker and
    // mark the first snapshot as a restore via isLoading.
    // Actually: pendingRestore starts true on construction, so the first
    // setState IS the initial snapshot. Reset the call counter expectation
    // accordingly.
    // (No additional setState needed.)

    await new Promise((r) => setTimeout(r, 0));
    expect(streamCall).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("promotes an in-progress tool call from the initial snapshot when it changes", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(
      createState([createAssistantMessage('{"query":"Lon', { query: "Lon" })]),
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(streamCall).not.toHaveBeenCalled();

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    const [reader] = streamCall.mock.calls[0]!;
    await expect(reader.args.get("query")).resolves.toBe("London");
    const response = await reader.response.get();
    expect(response.result).toEqual({ source: "history" });

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("does not re-fire streamCall when an initial-snapshot tool call is unchanged in later snapshots", async () => {
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(streamCall).not.toHaveBeenCalled();
  });

  it("does not emit a cancellation onResult for pre-resolved tool calls aborted by reset", async () => {
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(async () => ({ forecast: "ok" })),
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    tracker.reset();

    // Flush microtasks through the executor's abort race + the stream
    // pipeline so any cancellation `result` chunk has a chance to land
    // before we assert it didn't.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }

    expect(onResult).not.toHaveBeenCalled();
  });

  it("fires streamCall when an initial-snapshot in-progress tool call grows its argsText (no result yet)", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(
      createState([createAssistantMessage('{"query":"Lon', { query: "Lon" })]),
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(streamCall).not.toHaveBeenCalled();

    tracker.setState(
      createState([
        createAssistantMessage('{"query":"London","detail', {
          query: "London",
          detail: undefined,
        }),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    // No result yet → response promise stays pending; execute is gated on
    // complete args, so it must not have fired either.
    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("fires streamCall exactly once when an initial in-progress tool call is promoted partially, then later resolved", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(
      createState([createAssistantMessage('{"query":"Lon', { query: "Lon" })]),
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(streamCall).not.toHaveBeenCalled();

    // First post-restore change: promote (streamCall fires).
    tracker.setState(
      createState([
        createAssistantMessage('{"query":"London"', { query: "London" }),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    // Subsequent live update completing args + landing a backend result.
    // The entry is already active, so this must not re-fire streamCall.
    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { source: "history" } },
        ),
      ]),
    );

    const [reader] = streamCall.mock.calls[0]!;
    const response = await reader.response.get();
    expect(response.result).toEqual({ source: "history" });

    // Subsequent partial→resolved updates after promotion must not produce
    // a second streamCall.
    expect(streamCall).toHaveBeenCalledTimes(1);
  });

  it("exposes the resolved result on the streamCall reader for tool calls observed already-resolved live", async () => {
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn();
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"London"}',
          { query: "London" },
          { result: { city: "London", temp: 12 }, isError: false },
        ),
      ]),
    );

    await waitFor(() => {
      expect(streamCall).toHaveBeenCalledTimes(1);
    });

    const [reader] = streamCall.mock.calls[0]!;
    const response = await reader.response.get();
    expect(response.result).toEqual({ city: "London", temp: 12 });
    expect(response.isError).toBe(false);

    // execute is suppressed for pre-resolved tool calls so client-side
    // side effects don't double-run.
    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("fires streamCall for already-resolved nested tool calls surfaced via content.messages", async () => {
    const parentStreamCall = vi.fn();
    const childStreamCall = vi.fn();
    const parentExecute = vi.fn(async () => ({ scope: "parent" }));
    const childExecute = vi.fn(async () => ({ scope: "child" }));
    const getTools = () => ({
      parentTool: {
        parameters: { type: "object", properties: {} },
        execute: parentExecute,
        streamCall: parentStreamCall,
      } satisfies Tool,
      childTool: {
        parameters: { type: "object", properties: {} },
        execute: childExecute,
        streamCall: childStreamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};

    const nestedMessage = createAssistantMessage(
      '{"query":"child"}',
      { query: "child" },
      {
        toolCallId: "tool-child",
        toolName: "childTool",
        result: { from: "nested-history" },
      },
    );

    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange,
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"query":"parent"}',
          { query: "parent" },
          {
            toolName: "parentTool",
            result: { from: "parent-history" },
            nestedMessages: [nestedMessage],
          },
        ),
      ]),
    );

    await waitFor(() => {
      expect(parentStreamCall).toHaveBeenCalledTimes(1);
      expect(childStreamCall).toHaveBeenCalledTimes(1);
    });

    const [childReader] = childStreamCall.mock.calls[0]!;
    const childResponse = await childReader.response.get();
    expect(childResponse.result).toEqual({ from: "nested-history" });
    await expect(childReader.args.get("query")).resolves.toBe("child");

    expect(parentExecute).not.toHaveBeenCalled();
    expect(childExecute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("fires streamCall exactly once per toolCallId across the full monotonic args + backend-result lifecycle", async () => {
    // Lock down the "exactly once per toolCallId" contract by walking a
    // tool call through the normal lifecycle (monotonic args growth +
    // post-completion mutations + backend result + a key reorder + a
    // result replacement) and verifying streamCall fires exactly once.
    //
    // The pathological mid-stream regression case (A.2) is covered by
    // the assistant-stream ordering regression test in
    // packages/assistant-stream/src/core/modules/tool-call.test.ts.
    const streamCall = vi.fn();
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const onStatusesChange = () => {};
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(getTools, {
        onResult,
        onStatusesChange,
      });
      tracker.setState(createState([]));

      // First observation, partial (monotonic).
      tracker.setState(
        createState([createAssistantMessage('{"a":1', { a: 1 })]),
      );

      await waitFor(() => {
        expect(streamCall).toHaveBeenCalledTimes(1);
      });

      // Args grow monotonically (A.1) — still one fire.
      tracker.setState(
        createState([createAssistantMessage('{"a":1,"b":', { a: 1 })]),
      );

      // First resolution (A.5).
      tracker.setState(
        createState([
          createAssistantMessage(
            '{"a":1,"b":3}',
            { a: 1, b: 3 },
            { result: { source: "backend" } },
          ),
        ]),
      );

      await waitFor(async () => {
        const [reader] = streamCall.mock.calls[0]!;
        const response = await reader.response.get();
        expect(response.result).toEqual({ source: "backend" });
      });

      // A.3 key reorder of the complete argsText — still one fire.
      tracker.setState(
        createState([
          createAssistantMessage(
            '{"b":3,"a":1}',
            { a: 1, b: 3 },
            { result: { source: "backend" } },
          ),
        ]),
      );

      // A.6 result replacement (same toolCallId, different result) —
      // still one fire (the silent-ignore branch in _processMessages).
      tracker.setState(
        createState([
          createAssistantMessage(
            '{"b":3,"a":1}',
            { a: 1, b: 3 },
            { result: { source: "backend", revised: true } },
          ),
        ]),
      );

      // Flush any deferred work.
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 0));
      }

      // The hard contract.
      expect(streamCall).toHaveBeenCalledTimes(1);
      // execute is suppressed because the tool call resolved via a backend
      // result on the resolution snapshot (pre-resolved path activates
      // skipExecute at startActiveEntry time — but here we created the
      // entry pre-resolution and transitioned in. The non-skipExecute
      // execute path won't fire either, because by the time args close,
      // the reader's response has already resolved, and ToolExecutionStream
      // routes the result chunk back without invoking execute again).
      // We don't pin the exact path; just that it's at most one.
      expect(execute.mock.calls.length).toBeLessThanOrEqual(1);
      // No second onResult either (entry.hasResult short-circuits both
      // the parse-failure error chunk and the redundant backend result).
      expect(onResult).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

import type { Tool } from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import {
  ToolInvocationTracker,
  type ToolExecutionStatus,
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
): ToolInvocationTracker.Snapshot => ({
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
    approval?: { id: string; approved?: boolean };
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
      ...(options?.approval && { approval: options.approval }),
    },
  ],
});

/**
 * The stream failure that sets this flag cannot be provoked through the public
 * API: `unstable_toolResultStream` turns a throwing tool into an error result
 * rather than an error chunk, so the transform never rejects. The recovery
 * branch it guards is reachable on its own.
 */
const killPipeline = (tracker: ToolInvocationTracker) => {
  (tracker as unknown as { _pipelineDead: boolean })._pipelineDead = true;
};

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

  it("does not auto-submit a parse-error result when divergent argsText closes without a backend result", async () => {
    // A human-in-the-loop tool whose argsText diverges mid-stream and never
    // re-converges, with no backend result at close time. The args stream must
    // not close on the divergent snapshot (which holds a stale prefix the
    // execution path would parse), so no bogus parse-error result is
    // auto-submitted to resume the host graph and abandon the pending
    // interrupt.
    const execute = vi.fn(async () => ({ forecast: "ok" }));
    const streamCall = vi.fn((_reader, { human }) => {
      // Request human input immediately — sets up the pending interrupt.
      void human({ request: "approve" });
    });
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
        streamCall,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    let statuses: Record<string, ToolExecutionStatus> = {};
    const onStatusesChange = (s: ReadonlyMap<string, ToolExecutionStatus>) => {
      statuses = Object.fromEntries(s);
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(getTools, {
        onResult,
        onStatusesChange,
      });
      tracker.setState(createState([]));

      tracker.setState(
        createState([
          createAssistantMessage('{"query":"London","longitude":0', {
            query: "London",
            longitude: 0,
          }),
        ]),
      );

      // The pending interrupt is set up via streamCall → human().
      await waitFor(() => {
        expect(statuses["tool-1"]?.type).toBe("interrupt");
      });

      // Divergent regression (not a prefix of the streamed text).
      tracker.setState(
        createState([
          createAssistantMessage('{"query":"London","longitude":-0.125', {
            query: "London",
            longitude: -0.125,
          }),
        ]),
      );

      // Complete valid JSON, divergent from the streamed prefix, no backend
      // result. Previously this closed the args stream on the snapshot's
      // completeness, parsed the stale prefix, and auto-submitted an error.
      tracker.setState(
        createState([
          createAssistantMessage(
            '{"query":"London","longitude":-0.125,"latitude":51.5072}',
            { query: "London", longitude: -0.125, latitude: 51.5072 },
          ),
        ]),
      );

      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 0));
      }

      // No bogus parse-error result is auto-submitted, so the host graph is
      // not resumed with a fake tool failure and the pending interrupt is
      // preserved.
      expect(onResult).not.toHaveBeenCalled();
      // The frontend execute never ran: the stale prefix was never parsed.
      expect(execute).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("keeps a human-input interrupt that execute requests before its first await", async () => {
    const execute = vi.fn(async (_args, { human }) => ({
      approved: (await human({ request: "approve" })) === true,
    }));
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
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );

    await waitFor(() => {
      expect(statuses["tool-1"]?.type).toBe("interrupt");
    });

    expect(tracker.resume("tool-1", true)).toBe(true);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCallId: "tool-1",
          result: { approved: true },
        }),
      );
    });
    expect(statuses).toEqual({});
  });

  it("marks a fresh execution as executing when an earlier one left a human-input request behind", async () => {
    const execute = vi
      .fn()
      .mockImplementationOnce((_args, { human }) =>
        human({ request: "approve" }),
      )
      .mockImplementationOnce(() => new Promise(() => {}));
    const getTools = () => ({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    let statuses: Record<string, ToolExecutionStatus> = {};
    const tracker = new ToolInvocationTracker(getTools, {
      onResult: vi.fn(),
      onStatusesChange: (s: ReadonlyMap<string, ToolExecutionStatus>) => {
        statuses = Object.fromEntries(s);
      },
    });
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );
    await waitFor(() => {
      expect(statuses["tool-1"]?.type).toBe("interrupt");
    });

    killPipeline(tracker);
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"Paris"}', { query: "Paris" })],
        false,
      ),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(2);
      expect(statuses["tool-1"]?.type).toBe("executing");
    });
  });

  it("does not auto-submit a parse-error result for a non-executable tool whose divergent argsText closes", async () => {
    // Same close-gating mismatch as the executable case, but for a tool with
    // no frontend execute. Closing on the divergent complete snapshot would
    // still parse the incomplete stale prefix and fabricate a parse-error
    // result, so the close must gate on the controller's streamed content.
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

      // Incomplete prefix while the run is still streaming.
      tracker.setState(
        createState([createAssistantMessage('{"a":1', { a: 1 })], true),
      );

      // Run settles and the snapshot regresses to a complete divergent text.
      tracker.setState(
        createState([createAssistantMessage('{"a":2}', { a: 2 })], false),
      );

      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 0));
      }

      expect(onResult).not.toHaveBeenCalled();
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
    tracker.setState(createState([], false));

    // Single monotonic snapshot growing to a complete value triggers execute.
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"', { query: "London" })],
        false,
      ),
    );

    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
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

  it("never executes a tool call that carries a provider approval", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([]));

    const gated = (approval: { id: string; approved?: boolean }) =>
      createAssistantMessage(
        '{"path":"/tmp/a"}',
        { path: "/tmp/a" },
        { toolName: "deleteFile", approval },
      );

    tracker.setState(createState([gated({ id: "approval-1" })], false));
    await new Promise((r) => setTimeout(r, 0));
    expect(execute).not.toHaveBeenCalled();

    tracker.setState(
      createState([gated({ id: "approval-1", approved: true })], true),
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("stops executing a live tool call once a provider approval lands", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp',
            {},
            { toolName: "deleteFile" },
          ),
        ],
        true,
      ),
    );
    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile", approval: { id: "approval-1" } },
          ),
        ],
        true,
      ),
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("drops the result of an in-flight execute once a provider approval lands", async () => {
    let resolveExecute!: (value: { deleted: boolean }) => void;
    const execute = vi.fn(
      () =>
        new Promise<{ deleted: boolean }>((r) => {
          resolveExecute = r;
        }),
    );
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(
      getTools,
      { onResult, onStatusesChange: () => {} },
      () => true,
    );
    tracker.setState(createState([]));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            {
              toolName: "deleteFile",
            },
          ),
        ],
        true,
      ),
    );
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            {
              toolName: "deleteFile",
              approval: { id: "approval-1" },
            },
          ),
        ],
        true,
      ),
    );
    resolveExecute({ deleted: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(onResult).not.toHaveBeenCalled();
  });

  it("does not execute a registered tool while the provider's run is open", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([]));

    const complete = (isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(complete(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(execute).not.toHaveBeenCalled();

    tracker.setState(complete(false));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
  });

  it("streams a streamCall tool's args while the run is open and executes it after", async () => {
    const streamed: unknown[] = [];
    const streamCall = vi.fn(
      async (reader: {
        args: { streamValues: () => AsyncIterable<unknown> };
      }) => {
        for await (const partial of reader.args.streamValues())
          streamed.push(partial);
      },
    );
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        streamCall,
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    tracker.setState(
      createState([
        createAssistantMessage(
          '{"path":"/tmp/a"',
          { path: "/tmp/a" },
          {
            toolName: "deleteFile",
          },
        ),
      ]),
    );
    tracker.setState(
      createState([
        createAssistantMessage(
          '{"path":"/tmp/a"}',
          { path: "/tmp/a" },
          {
            toolName: "deleteFile",
          },
        ),
      ]),
    );

    await waitFor(() => expect(streamCall).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(streamed.length).toBeGreaterThan(0));
    expect(execute).not.toHaveBeenCalled();

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            {
              toolName: "deleteFile",
            },
          ),
        ],
        false,
      ),
    );

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(streamCall).toHaveBeenCalledTimes(1);
  });

  it("never executes a registered tool that was waiting when the turn was aborted", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    const complete = (isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(complete(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(execute).not.toHaveBeenCalled();

    await tracker.abort({ discardPending: true });

    tracker.setState(complete(false));
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("still executes a waiting tool when an abort only interrupts the turn", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    const complete = (isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(complete(true));
    await new Promise((r) => setTimeout(r, 0));

    await tracker.abort();

    tracker.setState(complete(false));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
  });

  it("keeps a discarded tool call skipped once its args complete", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    const live = (argsText: string, isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            argsText,
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(live('{"path":"/tm', true));
    await new Promise((r) => setTimeout(r, 0));

    await tracker.abort({ discardPending: true });

    tracker.setState(live('{"path":"/tmp/a"}', false));
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("keeps a discarded call skipped when the pipeline restarts before it settles", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    const complete = (isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(complete(true));
    await new Promise((r) => setTimeout(r, 0));
    await tracker.abort({ discardPending: true });

    killPipeline(tracker);
    tracker.setState(complete(false));
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("still executes a waiting call when the pipeline restarts before it settles", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([], false));

    const complete = (isRunning: boolean) =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        isRunning,
      );

    tracker.setState(complete(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(execute).not.toHaveBeenCalled();

    killPipeline(tracker);
    tracker.setState(complete(false));

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
  });

  it("never executes a registered tool the provider gates before its run ends", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(getTools, {
      onResult,
      onStatusesChange: () => {},
    });
    tracker.setState(createState([]));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        true,
      ),
    );
    await new Promise((r) => setTimeout(r, 0));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile", approval: { id: "approval-1" } },
          ),
        ],
        false,
      ),
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("never executes a tool call the adapter reports as provider-owned", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const tracker = new ToolInvocationTracker(
        getTools,
        { onResult, onStatusesChange: () => {} },
        () => false,
      );
      tracker.setState(createState([]));

      tracker.setState(
        createState(
          [
            createAssistantMessage(
              '{"path":"/tmp/a"}',
              { path: "/tmp/a" },
              { toolName: "deleteFile" },
            ),
          ],
          true,
        ),
      );
      await new Promise((r) => setTimeout(r, 0));

      expect(execute).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);

      tracker.setState(
        createState(
          [
            createAssistantMessage(
              '{"path":"/tmp/a"}',
              { path: "/tmp/a" },
              { toolName: "deleteFile", result: { server: "deleted" } },
            ),
          ],
          false,
        ),
      );
      await new Promise((r) => setTimeout(r, 0));

      expect(execute).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("executes a tool call the adapter reports as client-owned", async () => {
    const execute = vi.fn(async () => ({ deleted: true }));
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(
      getTools,
      { onResult, onStatusesChange: () => {} },
      (toolCall) => toolCall.toolCallId === "tool-1",
    );
    tracker.setState(createState([]));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        true,
      ),
    );
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
  });

  it("keeps the result of a call the adapter stops reporting as client-owned mid-execution", async () => {
    let resolveExecute!: (value: { deleted: boolean }) => void;
    const execute = vi.fn(
      () =>
        new Promise<{ deleted: boolean }>((r) => {
          resolveExecute = r;
        }),
    );
    const getTools = () => ({
      deleteFile: {
        parameters: { type: "object", properties: {} },
        execute,
      } satisfies Tool,
    });
    const onResult = vi.fn();
    let clientOwned = true;
    const tracker = new ToolInvocationTracker(
      getTools,
      { onResult, onStatusesChange: () => {} },
      () => clientOwned,
    );
    tracker.setState(createState([]));

    const live = () =>
      createState(
        [
          createAssistantMessage(
            '{"path":"/tmp/a"}',
            { path: "/tmp/a" },
            { toolName: "deleteFile" },
          ),
        ],
        true,
      );

    tracker.setState(live());
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    clientOwned = false;
    tracker.setState(live());
    resolveExecute({ deleted: true });

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
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
    tracker.setState(createState([], false));

    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    tracker.reset();

    await Promise.resolve();

    tracker.setState(createState([], false));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"query":"London"}',
            { query: "London" },
            { result: { source: "history" } },
          ),
        ],
        false,
      ),
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
    tracker.setState(createState([], false));

    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"query":"parent"}',
            { query: "parent" },
            {
              result: { source: "history" },
              toolName: "resolvedOnly",
              nestedMessages: [nestedMessage],
            },
          ),
        ],
        false,
      ),
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
    tracker.setState(createState([], false));

    tracker.setState(
      createState(
        [
          createAssistantMessage('{"a":1,"b":2}', {
            a: 1,
            b: 2,
          }),
        ],
        false,
      ),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });

    tracker.setState(
      createState(
        [
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
        ],
        false,
      ),
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

describe("ToolInvocationTracker reset", () => {
  const trackerWith = (tools: Record<string, Tool>) => {
    let statuses: Record<string, ToolExecutionStatus> = {};
    const tracker = new ToolInvocationTracker(() => tools, {
      onResult: vi.fn(),
      onStatusesChange: (s: ReadonlyMap<string, ToolExecutionStatus>) => {
        statuses = Object.fromEntries(s);
      },
    });
    return { tracker, statuses: () => statuses };
  };

  it("clears statuses for discarded executions that never settle", async () => {
    const { tracker, statuses } = trackerWith({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(() => new Promise(() => {})),
      } satisfies Tool,
    });
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );
    await waitFor(() => {
      expect(statuses()["tool-1"]?.type).toBe("executing");
    });

    tracker.reset();

    expect(statuses()).toEqual({});

    // A new-session snapshot restoring tool activity must not drag the
    // discarded id back in through the whole-map republication. The first
    // post-reset snapshot is the fresh session's empty state, consuming the
    // pending-restore mark.
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"query":"Paris"}',
            { query: "Paris" },
            { toolCallId: "tool-2" },
          ),
        ],
        false,
      ),
    );
    await waitFor(() => {
      expect(statuses()["tool-2"]?.type).toBe("executing");
    });
    expect(statuses()["tool-1"]).toBeUndefined();
  });

  it("does not republish sibling statuses when a discarded execution settles after reset", async () => {
    const settled = Promise.withResolvers<void>();
    const { tracker, statuses } = trackerWith({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(
          (_args, { abortSignal }: { abortSignal: AbortSignal }) =>
            new Promise((resolve) => {
              abortSignal.addEventListener("abort", () => {
                resolve({ ok: true });
                settled.resolve();
              });
            }),
        ),
      } satisfies Tool,
      pressureSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(() => new Promise(() => {})),
      } satisfies Tool,
    });
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [
          createAssistantMessage('{"query":"London"}', { query: "London" }),
          createAssistantMessage(
            '{"query":"London"}',
            { query: "London" },
            {
              toolCallId: "tool-2",
              toolName: "pressureSearch",
            },
          ),
        ],
        false,
      ),
    );
    await waitFor(() => {
      expect(statuses()["tool-1"]?.type).toBe("executing");
      expect(statuses()["tool-2"]?.type).toBe("executing");
    });

    tracker.reset();
    expect(statuses()).toEqual({});

    // The settle-after-abort of tool-1 is what could republish tool-2;
    // await it deterministically instead of sleeping.
    await settled.promise;
    await new Promise((r) => setTimeout(r, 0));
    expect(statuses()).toEqual({});
  });

  it("rejects a human-input request from a discarded execution without resurrecting its status", async () => {
    let humanFn: ((payload: unknown) => Promise<unknown>) | undefined;
    const { tracker, statuses } = trackerWith({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(() => new Promise(() => {})),
        streamCall: vi.fn((_reader, { human }) => {
          humanFn = human;
        }),
      } satisfies Tool,
    });
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );
    await waitFor(() => {
      expect(statuses()["tool-1"]?.type).toBe("executing");
      expect(humanFn).toBeDefined();
    });

    tracker.reset();

    await expect(humanFn!({ request: "approve" })).rejects.toThrow(
      "Tool execution aborted",
    );
    expect(statuses()).toEqual({});
  });

  it("rejects a late human-input request when reset reuses the tool call id", async () => {
    const humanFns: ((payload: unknown) => Promise<unknown>)[] = [];
    const { tracker, statuses } = trackerWith({
      weatherSearch: {
        parameters: { type: "object", properties: {} },
        execute: vi.fn(() => new Promise(() => {})),
        streamCall: vi.fn((_reader, { human }) => {
          humanFns.push(human);
        }),
      } satisfies Tool,
    });

    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );
    await waitFor(() => {
      expect(humanFns).toHaveLength(1);
      expect(statuses()["tool-1"]?.type).toBe("executing");
    });

    tracker.reset();
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"query":"Paris"}',
            { query: "Paris" },
            { toolCallId: "tool-1" },
          ),
        ],
        false,
      ),
    );
    await waitFor(() => expect(humanFns).toHaveLength(2));

    await expect(humanFns[0]!({ stale: true })).rejects.toThrow(
      "Tool execution aborted",
    );
    expect(statuses()["tool-1"]?.type).toBe("executing");

    tracker.reset();
  });

  it("drops a late result when reset reuses the tool call id", async () => {
    const executions: Array<{
      resolve: (value: { session: string }) => void;
      promise: Promise<{ session: string }>;
    }> = [];
    const onResult = vi.fn();
    const tracker = new ToolInvocationTracker(
      () => ({
        weatherSearch: {
          parameters: { type: "object", properties: {} },
          execute: vi.fn(
            (_args: unknown, { abortSignal }: { abortSignal: AbortSignal }) => {
              let resolveExecution!: (value: { session: string }) => void;
              const promise = new Promise<{ session: string }>((resolve) => {
                resolveExecution = resolve;
              });
              const execution = { promise, resolve: resolveExecution };
              abortSignal.addEventListener("abort", () => {
                execution.resolve({ session: "old" });
              });
              executions.push(execution);
              return promise;
            },
          ),
        } satisfies Tool,
      }),
      { onResult, onStatusesChange: vi.fn() },
    );

    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [createAssistantMessage('{"query":"London"}', { query: "London" })],
        false,
      ),
    );
    await waitFor(() => expect(executions).toHaveLength(1));

    tracker.reset();
    tracker.setState(createState([], false));
    tracker.setState(
      createState(
        [
          createAssistantMessage(
            '{"query":"Paris"}',
            { query: "Paris" },
            { toolCallId: "tool-1" },
          ),
        ],
        false,
      ),
    );
    await waitFor(() => expect(executions).toHaveLength(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onResult).not.toHaveBeenCalled();

    executions[1]!.resolve({ session: "new" });
    await waitFor(() => {
      expect(onResult).toHaveBeenCalledOnce();
      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCallId: "tool-1",
          result: { session: "new" },
        }),
      );
    });

    tracker.reset();
  });
});

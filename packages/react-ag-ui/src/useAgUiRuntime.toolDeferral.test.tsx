// @vitest-environment jsdom

import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { AssistantRuntime, ToolCallMessagePart } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import type { HttpAgent } from "@ag-ui/client";
import { z } from "zod";
import { useAgUiRuntime } from "./useAgUiRuntime";
import type { AgUiInterrupt } from "./runtime/types";

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

const GATE: AgUiInterrupt = {
  id: "int-1",
  reason: "tool_call",
  toolCallId: "tc-1",
  message: "Delete /tmp/a?",
};

const toolCalls = (runtime: AssistantRuntime): ToolCallMessagePart[] =>
  runtime.thread
    .getState()
    .messages.flatMap((message) => message.content as readonly unknown[])
    .filter(
      (part): part is ToolCallMessagePart =>
        (part as ToolCallMessagePart).type === "tool-call",
    );

const flush = () =>
  act(async () => void (await new Promise((r) => setTimeout(r, 0))));

/**
 * Holds the run open after the tool call's arguments complete, so the window
 * between complete args and the run's outcome is observable as its own render
 * rather than coalescing with the tail.
 */
const renderHeldRun = async (tail: (subscriber: Subscriber) => void) => {
  let releaseTail!: () => void;
  const held = new Promise<void>((r) => (releaseTail = r));
  let argsDelivered!: () => void;
  const argsDeliveredP = new Promise<void>((r) => (argsDelivered = r));

  const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
    if (runAgent.mock.calls.length > 1) {
      subscriber.onRunFinalized?.(undefined);
      return;
    }
    subscriber.onToolCallStartEvent?.({
      event: {
        type: "TOOL_CALL_START",
        toolCallId: "tc-1",
        toolCallName: "delete_file",
      },
    });
    subscriber.onToolCallArgsEvent?.({
      event: {
        type: "TOOL_CALL_ARGS",
        toolCallId: "tc-1",
        delta: '{"path":"/tmp/a"}',
      },
    });
    subscriber.onToolCallEndEvent?.({
      event: { type: "TOOL_CALL_END", toolCallId: "tc-1" },
    });
    argsDelivered();
    await held;
    tail(subscriber);
    subscriber.onRunFinalized?.(undefined);
  });
  const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;

  const execute = vi.fn(async () => ({ deleted: true }));
  const DeleteFileTool = () => {
    useAssistantTool({
      toolName: "delete_file",
      description: "delete a file",
      parameters: z.object({ path: z.string() }),
      execute,
    });
    return null;
  };

  const { result } = renderHook(() => useAgUiRuntime({ agent }));
  render(
    <AssistantRuntimeProvider runtime={result.current}>
      <DeleteFileTool />
    </AssistantRuntimeProvider>,
  );
  await flush();

  await act(async () => {
    void result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "delete it" }],
    });
    await argsDeliveredP;
  });
  await flush();

  return {
    runtime: result,
    execute,
    settle: async () => {
      await act(async () => {
        releaseTail();
        await new Promise((r) => setTimeout(r, 0));
      });
      await flush();
    },
  };
};

afterEach(() => cleanup());

describe("useAgUiRuntime frontend tool deferral", () => {
  it("does not run a frontend execute on a call the provider is about to gate", async () => {
    const { runtime, execute, settle } = await renderHeldRun((subscriber) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: { type: "interrupt", interrupts: [GATE] },
        },
      });
    });

    const inWindow = toolCalls(runtime.current)[0]!;
    expect(inWindow.argsText).toBe('{"path":"/tmp/a"}');
    expect(inWindow.approval).toBeUndefined();
    expect(inWindow.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();

    await settle();

    const gated = toolCalls(runtime.current)[0]!;
    expect(gated.approval).toEqual({
      id: "int-1",
      prompt: "Delete /tmp/a?",
    });
    expect(gated.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a gate beside a non-gate interrupt",
      [GATE, { id: "int-2", reason: "confirmation" }] as AgUiInterrupt[],
    ],
    [
      "two gates naming the call",
      [GATE, { ...GATE, id: "int-2" }] as AgUiInterrupt[],
    ],
    [
      "a gate beside one naming an unrendered call",
      [GATE, { ...GATE, id: "int-2", toolCallId: "tc-missing" }],
    ],
    [
      "an input_required interrupt naming the call",
      [{ id: "int-1", reason: "input_required", toolCallId: "tc-1" }],
    ],
  ] as [string, AgUiInterrupt[]][])(
    "does not run a frontend execute on a call named by %s",
    async (_label, interrupts) => {
      const { runtime, execute, settle } = await renderHeldRun((subscriber) => {
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: "run-1",
            outcome: { type: "interrupt", interrupts },
          },
        });
      });

      await settle();

      const call = toolCalls(runtime.current)[0]!;
      expect(call.approval).toBeUndefined();
      expect(call.result).toBeUndefined();
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("keeps the call withheld after the interrupt that named it is answered", async () => {
    const interrupts: AgUiInterrupt[] = [
      GATE,
      { id: "int-2", reason: "confirmation" },
    ];
    const { runtime, execute, settle } = await renderHeldRun((subscriber) => {
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: { type: "interrupt", interrupts },
        },
      });
    });
    await settle();
    expect(runtime.current.unstable_getPendingInterrupts()).toHaveLength(2);

    await act(async () => {
      await runtime.current.unstable_submitInterruptResponses([
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { approved: true },
        },
        { interruptId: "int-2", status: "resolved", payload: true },
      ]);
    });
    await flush();

    expect(runtime.current.unstable_getPendingInterrupts()).toHaveLength(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it("keeps a call withheld when an interrupt named it before the run rendered it", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length === 1) {
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: "run-1",
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "int-1", reason: "input_required", toolCallId: "tc-2" },
              ],
            },
          },
        });
      } else {
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "tc-2",
            toolCallName: "delete_file",
          },
        });
        subscriber.onToolCallArgsEvent?.({
          event: {
            type: "TOOL_CALL_ARGS",
            toolCallId: "tc-2",
            delta: '{"path":"/tmp/a"}',
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "tc-2" },
        });
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: "run-2" },
        });
      }
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const execute = vi.fn(async () => ({ deleted: true }));
    const DeleteFileTool = () => {
      useAssistantTool({
        toolName: "delete_file",
        description: "delete a file",
        parameters: z.object({ path: z.string() }),
        execute,
      });
      return null;
    };
    const { result } = renderHook(() => useAgUiRuntime({ agent }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <DeleteFileTool />
      </AssistantRuntimeProvider>,
    );
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "delete it" }],
      });
    });
    await flush();
    expect(result.current.unstable_getPendingInterrupts()).toHaveLength(1);

    await act(async () => {
      await result.current.unstable_submitInterruptResponses([
        { interruptId: "int-1", status: "resolved", payload: "ok" },
      ]);
    });
    await flush();

    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(toolCalls(result.current).map((c) => c.toolCallId)).toContain(
      "tc-2",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("runs a frontend execute on a new thread that reuses an id an interrupt named before", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      subscriber.onToolCallStartEvent?.({
        event: {
          type: "TOOL_CALL_START",
          toolCallId: "tc-1",
          toolCallName: "delete_file",
        },
      });
      subscriber.onToolCallArgsEvent?.({
        event: {
          type: "TOOL_CALL_ARGS",
          toolCallId: "tc-1",
          delta: '{"path":"/tmp/a"}',
        },
      });
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "tc-1" },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: `run-${runAgent.mock.calls.length}`,
          ...(runAgent.mock.calls.length === 1 && {
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "int-1", reason: "input_required", toolCallId: "tc-1" },
              ],
            },
          }),
        },
      });
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const execute = vi.fn(async () => ({ deleted: true }));
    const DeleteFileTool = () => {
      useAssistantTool({
        toolName: "delete_file",
        description: "delete a file",
        parameters: z.object({ path: z.string() }),
        execute,
      });
      return null;
    };
    const { result } = renderHook(() => {
      const [threadId, setThreadId] = useState("thread-a");
      return useAgUiRuntime({
        agent,
        adapters: {
          threadList: {
            threadId,
            onSwitchToNewThread: () => setThreadId("thread-b"),
          },
        },
      });
    });
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <DeleteFileTool />
      </AssistantRuntimeProvider>,
    );
    const send = async () => {
      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "delete it" }],
        });
      });
      await flush();
    };

    await send();
    expect(result.current.unstable_getPendingInterrupts()).toHaveLength(1);
    expect(execute).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.threads.switchToNewThread();
    });
    await send();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(toolCalls(result.current)[0]!.result).toEqual({ deleted: true });
  });

  it("does not run a frontend execute on a call the agent answers itself", async () => {
    const { runtime, execute, settle } = await renderHeldRun((subscriber) => {
      subscriber.onToolCallResultEvent?.({
        event: {
          type: "TOOL_CALL_RESULT",
          messageId: "m-result",
          toolCallId: "tc-1",
          content: "server did the delete",
        },
      });
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
    });

    expect(toolCalls(runtime.current)[0]!.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();

    await settle();

    expect(toolCalls(runtime.current)[0]!.result).toBe("server did the delete");
    expect(execute).not.toHaveBeenCalled();
  });

  it("runs a frontend execute once the run settles with no outcome for the call", async () => {
    const { runtime, execute, settle } = await renderHeldRun((subscriber) => {
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });
    });

    expect(execute).not.toHaveBeenCalled();

    await settle();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(toolCalls(runtime.current)[0]!.result).toEqual({ deleted: true });
  });
});

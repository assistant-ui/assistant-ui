// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { AssistantRuntime, ToolCallMessagePart } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useAssistantTool,
  type ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import type { HttpAgent } from "@ag-ui/client";
import { z } from "zod";
import { useAgUiRuntime } from "./useAgUiRuntime";
import { useAgUiSteerAway } from "./hooks";
import type { AgUiInterrupt } from "./runtime/types";

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

const GATE: AgUiInterrupt = {
  id: "int-1",
  reason: "tool_call",
  toolCallId: "tc-1",
  message: "Delete /tmp/a?",
};

// Gates the first run on an interrupt and lets every later run settle, so a
// resumed run is observable as a second call rather than a second gate.
const gatingAgent = (interrupts: readonly AgUiInterrupt[] = [GATE]) => {
  const runAgent = vi.fn(async (input: unknown, subscriber: Subscriber) => {
    if (runAgent.mock.calls.length > 1) {
      subscriber.onRunFinalized?.(undefined);
      return;
    }
    for (const interrupt of interrupts) {
      const toolCallId = interrupt.toolCallId ?? "tc-x";
      subscriber.onToolCallStartEvent?.({
        event: {
          type: "TOOL_CALL_START",
          toolCallId,
          toolCallName: "delete_file",
        },
      });
      subscriber.onToolCallArgsEvent?.({
        event: {
          type: "TOOL_CALL_ARGS",
          toolCallId,
          delta: '{"path":"/tmp/a"}',
        },
      });
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId },
      });
    }
    subscriber.onRunFinishedEvent?.({
      event: {
        type: "RUN_FINISHED",
        runId: "run-1",
        outcome: { type: "interrupt", interrupts },
      },
    });
    subscriber.onRunFinalized?.(undefined);
    void input;
  });
  return {
    agent: { runAgent, abortRun: vi.fn() } as unknown as HttpAgent,
    runAgent,
  };
};

const steerAwayRef: { current: ReturnType<typeof useAgUiSteerAway> | null } = {
  current: null,
};

const SteerAway = () => {
  steerAwayRef.current = useAgUiSteerAway();
  return null;
};

const gatedThread = async (
  interrupts: readonly AgUiInterrupt[] = [GATE],
  options: { children?: React.ReactNode } = {},
) => {
  const { agent, runAgent } = gatingAgent(interrupts);
  const { result } = renderHook(() => useAgUiRuntime({ agent }));
  render(
    <AssistantRuntimeProvider runtime={result.current}>
      <SteerAway />
      {options.children}
    </AssistantRuntimeProvider>,
  );

  await act(async () => {
    await result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "delete it" }],
    });
  });
  await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

  return { runtime: result, runAgent };
};

const gatedPart = (runtime: AssistantRuntime, toolCallId = "tc-1") =>
  runtime.thread
    .getMessageByIndex(runtime.thread.getState().messages.length - 1)
    .getMessagePartByToolCallId(toolCallId);

const allToolCalls = (runtime: AssistantRuntime): ToolCallMessagePart[] =>
  runtime.thread
    .getState()
    .messages.flatMap((message) => message.content as readonly unknown[])
    .filter(
      (part): part is ToolCallMessagePart =>
        (part as ToolCallMessagePart).type === "tool-call",
    );

const resumeOf = (runAgent: ReturnType<typeof vi.fn>) =>
  (runAgent.mock.calls.at(-1)?.[0] as { resume?: unknown } | undefined)?.resume;

afterEach(() => cleanup());

describe("useAgUiRuntime tool approvals", () => {
  it("gates the tool call a tool_call interrupt names", async () => {
    const { runtime } = await gatedThread();

    expect(allToolCalls(runtime.current)[0]!.approval).toEqual({ id: "int-1" });
    expect(gatedPart(runtime.current).getState().status).toMatchObject({
      type: "requires-action",
    });
  });

  it("holds the run until every gate is decided, then resumes once in order", async () => {
    const second: AgUiInterrupt = {
      id: "int-2",
      reason: "tool_call",
      toolCallId: "tc-2",
      message: "Delete /tmp/b?",
    };
    const { runtime, runAgent } = await gatedThread([GATE, second]);

    await act(async () => {
      gatedPart(runtime.current, "tc-1").respondToToolApproval({
        approved: true,
      });
    });
    expect(runAgent).toHaveBeenCalledTimes(1);
    // The first decision survives the rerender the second gate triggers.
    expect(allToolCalls(runtime.current)[0]!.approval).toEqual({
      id: "int-1",
      approved: true,
    });

    await act(async () => {
      gatedPart(runtime.current, "tc-2").respondToToolApproval({
        approved: false,
        reason: "too risky",
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
      {
        interruptId: "int-2",
        status: "resolved",
        payload: { approved: false, reason: "too risky" },
      },
    ]);
    // Settlement consumes the resume array, so the approved gate stays approved.
    expect(allToolCalls(runtime.current)[0]!.approval).toEqual({
      id: "int-1",
      approved: true,
    });
    expect(
      allToolCalls(runtime.current).every((part) => part.result === undefined),
    ).toBe(true);
  });

  it("cancels a locally approved gate when the batch is discarded for both", async () => {
    const second: AgUiInterrupt = {
      id: "int-2",
      reason: "tool_call",
      toolCallId: "tc-2",
    };
    const { runtime, runAgent } = await gatedThread([GATE, second]);

    await act(async () => {
      gatedPart(runtime.current, "tc-1").respondToToolApproval({
        approved: true,
      });
    });
    await act(async () => {
      await steerAwayRef.current!("never mind");
    });

    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "cancelled" },
      { interruptId: "int-2", status: "cancelled" },
    ]);
    // The wire cancelled both, so the gate approved while its sibling was
    // still open cannot keep displaying an approval that was never sent.
    expect(allToolCalls(runtime.current).map((part) => part.approval)).toEqual([
      { id: "int-1", resolution: "cancelled" },
      { id: "int-2", resolution: "cancelled" },
    ]);
  });

  it("leaves a mixed batch entirely to the bespoke interrupt hooks", async () => {
    const { runtime } = await gatedThread([
      GATE,
      { id: "int-2", reason: "input_required", message: "which branch?" },
    ]);

    expect(
      allToolCalls(runtime.current).every(
        (part) => part.approval === undefined,
      ),
    ).toBe(true);
  });

  it("marks a discarded gate cancelled, matching the entry actually sent", async () => {
    const { runtime, runAgent } = await gatedThread();

    await act(async () => {
      await steerAwayRef.current!("never mind");
    });

    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "cancelled" },
    ]);
    expect(
      allToolCalls(runtime.current).find((p) => p.approval?.id === "int-1")
        ?.approval,
    ).toEqual({ id: "int-1", resolution: "cancelled" });
  });

  it("shows a bespoke resolved override as the decision it carried", async () => {
    const { runtime } = await gatedThread();

    await act(async () => {
      await steerAwayRef.current!("do it anyway", [
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { approved: true },
        },
      ]);
    });

    expect(
      allToolCalls(runtime.current).find((p) => p.approval?.id === "int-1")
        ?.approval,
    ).toEqual({ id: "int-1", approved: true });
  });

  it("keeps a gated call out of the tool-call action state a frontend tool would run from", async () => {
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
    const { runtime, runAgent } = await gatedThread([GATE], {
      children: <DeleteFileTool />,
    });

    // A frontend tool of the same name is registered and reaches the thread's
    // model context, so only the gate keeps the call from being actionable.
    expect(
      Object.keys(runtime.current.thread.getModelContext().tools ?? {}),
    ).toContain("delete_file");
    const message = runtime.current.thread.getState().messages.at(-1)!;
    expect(message.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(allToolCalls(runtime.current)[0]!.approval).toEqual({ id: "int-1" });
    expect(execute).not.toHaveBeenCalled();

    await act(async () => {
      gatedPart(runtime.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    // The provider owns the gated call: approving resumes the run rather than
    // resolving the call with a local result.
    expect(execute).not.toHaveBeenCalled();
    expect(
      allToolCalls(runtime.current).every((part) => part.result === undefined),
    ).toBe(true);
  });
});

describe("useAgUiRuntime tool approvals under an unsettled run", () => {
  // Exposes the gate through RUN_FINISHED while runAgent is still pending, so
  // a click lands in the window where the run has not finalized.
  const heldGatingAgent = () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runAgent = vi.fn(async (input: unknown, subscriber: Subscriber) => {
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
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "tc-1" },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: { type: "interrupt", interrupts: [GATE] },
        },
      });
      await held;
      subscriber.onRunFinalized?.(undefined);
      void input;
    });
    return {
      agent: { runAgent, abortRun: vi.fn() } as unknown as HttpAgent,
      runAgent,
      release,
    };
  };

  it("keeps the gate answerable after a click the in-flight run rejects", async () => {
    const { agent, runAgent, release } = heldGatingAgent();
    const onError = vi.fn();
    const { result } = renderHook(() => useAgUiRuntime({ agent, onError }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <></>
      </AssistantRuntimeProvider>,
    );

    result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "delete it" }],
    });
    await waitFor(() =>
      expect(allToolCalls(result.current)[0]?.approval).toEqual({
        id: "int-1",
      }),
    );
    expect(result.current.thread.getState().isRunning).toBe(true);

    await act(async () => {
      gatedPart(result.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect((onError.mock.calls[0]![0] as Error).message).toContain(
      "a run is already in progress",
    );
    // The rejected click must not have recorded a decision, or the retry
    // below would report the approval as already decided.
    expect(allToolCalls(result.current)[0]!.approval).toEqual({ id: "int-1" });

    await act(async () => {
      release();
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(false),
    );

    await act(async () => {
      await gatedPart(result.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
    ]);
  });
});

describe("useAgUiRuntime tool approvals across a messages snapshot", () => {
  // A snapshot whose assistant id differs from the optimistic one evicts the
  // in-flight assistant before the interrupt arrives; the gate must still be
  // stamped exactly once and stay answerable.
  const snapshotGatingAgent = () => {
    const runAgent = vi.fn(async (input: unknown, subscriber: Subscriber) => {
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
      subscriber.onMessagesSnapshotEvent?.({
        event: {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            { id: "u-1", role: "user", content: "delete it" },
            {
              id: "srv-assistant-1",
              role: "assistant",
              content: "",
              toolCalls: [
                {
                  id: "tc-1",
                  type: "function",
                  function: {
                    name: "delete_file",
                    arguments: '{"path":"/tmp/a"}',
                  },
                },
              ],
            },
          ],
        },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: { type: "interrupt", interrupts: [GATE] },
        },
      });
      subscriber.onRunFinalized?.(undefined);
      void input;
    });
    return {
      agent: { runAgent, abortRun: vi.fn() } as unknown as HttpAgent,
      runAgent,
    };
  };

  it("stamps the gate once and answers it after a snapshot lands mid-run", async () => {
    const { agent, runAgent } = snapshotGatingAgent();
    const { result } = renderHook(() => useAgUiRuntime({ agent }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <></>
      </AssistantRuntimeProvider>,
    );

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "delete it" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

    const gated = allToolCalls(result.current).filter(
      (part) => part.approval !== undefined,
    );
    expect(gated.map((part) => part.approval)).toEqual([{ id: "int-1" }]);

    await act(async () => {
      await gatedPart(result.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
    ]);
    expect(
      allToolCalls(result.current).filter(
        (part) => part.approval?.approved === true,
      ),
    ).toHaveLength(1);
  });
});

describe("useAgUiRuntime default rendering path", () => {
  // Renders the runtime through core's real MessagePrimitive.Parts, the seam
  // that supplies `approval` and `respondToApproval` to whichever tool
  // component is registered. A revert of the aggregator projection, of
  // `onRespondToToolApproval`, or of the wire mapping fails here.
  const ToolRenderer = ({
    approval,
    respondToApproval,
  }: ToolCallMessagePartProps) => {
    if (!approval || approval.approved !== undefined || approval.resolution) {
      return <div data-testid="settled" />;
    }
    return (
      <>
        <button onClick={() => respondToApproval?.({ approved: true })}>
          Allow
        </button>
        <button
          onClick={() => respondToApproval?.({ approved: false, reason: "no" })}
        >
          Deny
        </button>
      </>
    );
  };

  const Thread = () => (
    <ThreadPrimitiveMessages
      components={{
        Message: () => (
          <MessagePrimitiveParts
            components={{ tools: { Fallback: ToolRenderer } }}
          />
        ),
      }}
    />
  );

  it("sends approved:true when the rendered gate is allowed", async () => {
    const { runAgent } = await gatedThread([GATE], { children: <Thread /> });

    await waitFor(() => expect(screen.getByText("Allow")).toBeDefined());
    await act(async () => {
      screen.getByText("Allow").click();
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
    ]);
  });

  it("sends a resolved approved:false with the reason when denied", async () => {
    const { runAgent } = await gatedThread([GATE], { children: <Thread /> });

    await waitFor(() => expect(screen.getByText("Deny")).toBeDefined());
    await act(async () => {
      screen.getByText("Deny").click();
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      {
        interruptId: "int-1",
        status: "resolved",
        payload: { approved: false, reason: "no" },
      },
    ]);
  });
});

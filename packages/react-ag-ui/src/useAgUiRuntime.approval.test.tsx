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
import {
  useAgUiInterrupts,
  useAgUiSteerAway,
  useAgUiSubmitInterruptResponses,
} from "./hooks";
import type { AgUiInterrupt } from "./runtime/types";
import { readRawResponseSchema } from "./runtime/interrupt-internals";

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

const interruptsRef: { current: readonly AgUiInterrupt[] } = { current: [] };

const submitRef: {
  current: ReturnType<typeof useAgUiSubmitInterruptResponses> | null;
} = { current: null };

const SteerAway = () => {
  steerAwayRef.current = useAgUiSteerAway();
  interruptsRef.current = useAgUiInterrupts();
  submitRef.current = useAgUiSubmitInterruptResponses();
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

  it("holds and resumes a batch whose interrupt ids name prototype members", async () => {
    for (const id of ["__proto__", "constructor", "toString"]) {
      const { runtime, runAgent } = await gatedThread([
        { ...GATE, id },
        { id: "int-2", reason: "tool_call", toolCallId: "tc-2" },
      ]);

      await act(async () => {
        gatedPart(runtime.current, "tc-1").respondToToolApproval({
          approved: true,
        });
      });
      expect(runAgent).toHaveBeenCalledTimes(1);

      await act(async () => {
        gatedPart(runtime.current, "tc-2").respondToToolApproval({
          approved: false,
        });
      });
      await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

      expect(resumeOf(runAgent)).toEqual([
        { interruptId: id, status: "resolved", payload: { approved: true } },
        {
          interruptId: "int-2",
          status: "resolved",
          payload: { approved: false },
        },
      ]);
      cleanup();
    }
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

  it("leaves the tool call ungated when the live interrupt carries a rejecting schema", async () => {
    const { runtime } = await gatedThread([
      { ...GATE, responseSchema: false } as unknown as AgUiInterrupt,
    ]);

    expect(allToolCalls(runtime.current)[0]!.approval).toBeUndefined();
  });

  it("keeps a rejecting live schema readable without widening the public field", async () => {
    const { runtime } = await gatedThread([
      { ...GATE, responseSchema: false } as unknown as AgUiInterrupt,
    ]);
    const [interrupt] = interruptsRef.current;

    expect(interrupt?.responseSchema).toBeUndefined();
    expect(interrupt && readRawResponseSchema(interrupt)).toBe(false);
    // The exported reads a consumer wrote against the previous release still
    // typecheck: the field stays an object schema or absent.
    if (interrupt?.responseSchema !== undefined)
      expect(Object.keys(interrupt.responseSchema)).toEqual([]);
    const schema: Record<string, unknown> | undefined =
      interrupt?.responseSchema;
    expect(schema).toBeUndefined();
    expect(allToolCalls(runtime.current)[0]!.approval).toBeUndefined();
  });

  /**
   * `null` is not a JSON Schema, and it is what a server serializing an unset
   * optional field sends, so it reads as absent rather than disabling the seam.
   */
  it("gates a live interrupt whose schema is null", async () => {
    const { runtime } = await gatedThread([
      { ...GATE, responseSchema: null } as unknown as AgUiInterrupt,
    ]);
    const [interrupt] = interruptsRef.current;

    expect(allToolCalls(runtime.current)[0]!.approval).toEqual({ id: "int-1" });
    expect(interrupt?.responseSchema).toBeUndefined();
    expect(interrupt && readRawResponseSchema(interrupt)).toBeUndefined();
  });

  it("carries an object schema on the public field unchanged", async () => {
    await gatedThread([
      { ...GATE, responseSchema: { type: "object" } } as AgUiInterrupt,
    ]);

    expect(interruptsRef.current[0]?.responseSchema).toEqual({
      type: "object",
    });
    expect(readRawResponseSchema(interruptsRef.current[0]!)).toBeUndefined();
  });

  it("leaves the tool call ungated when a live object schema is malformed", async () => {
    for (const responseSchema of [
      { title: 42 },
      { description: [] },
      { type: ["object", "bogus"] },
      { required: ["approved", "approved"] },
      // Own properties named after `Object.prototype` members, as a server can
      // send them over the wire.
      JSON.parse('{"__proto__":{}}'),
      JSON.parse('{"constructor":{}}'),
      JSON.parse('{"toString":{}}'),
      JSON.parse('{"type":"object","valueOf":{}}'),
    ]) {
      const { runtime } = await gatedThread([
        { ...GATE, responseSchema } as unknown as AgUiInterrupt,
      ]);

      expect(allToolCalls(runtime.current)[0]!.approval).toBeUndefined();
      cleanup();
    }
  });

  it("clears a local approval a resolved override replaced with a payload of its own", async () => {
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
      await steerAwayRef.current!("do it my way", [
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { answer: 42 },
        },
      ]);
    });

    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { answer: 42 } },
      { interruptId: "int-2", status: "cancelled" },
    ]);
    // `{answer:42}` went out for the first gate, so the approval recorded while
    // its sibling was still open cannot keep displaying a decision never sent.
    expect(allToolCalls(runtime.current).map((part) => part.approval)).toEqual([
      { id: "int-1", resolution: "cancelled" },
      { id: "int-2", resolution: "cancelled" },
    ]);
  });

  it("resumes on a decision it validated, even when the clock crosses expiry mid-submission", async () => {
    const { runtime, runAgent } = await gatedThread([
      { ...GATE, expiresAt: new Date(2000).toISOString() },
    ]);

    // The gate is answerable at the first reading and expired at the second, so
    // a second validation would reject a decision already recorded.
    let readings = 0;
    const now = vi
      .spyOn(Date, "now")
      .mockImplementation(() => (readings++ === 0 ? 1000 : 3000));
    try {
      await act(async () => {
        await gatedPart(runtime.current).respondToToolApproval({
          approved: true,
        });
      });
      await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    } finally {
      now.mockRestore();
    }

    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
    ]);
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

describe("useAgUiRuntime approvals on a run that fails after the interrupt", () => {
  it("reports a failure raised by a resumed run only once", async () => {
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length > 1) {
        subscriber.onRunFailed?.({ error: new Error("resume failed") });
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
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const onError = vi.fn();

    const { result } = renderHook(() => useAgUiRuntime({ agent, onError }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <SteerAway />
      </AssistantRuntimeProvider>,
    );

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "delete it" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

    await act(async () => {
      gatedPart(result.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(onError.mock.calls.map((call) => call[0].message)).toEqual([
      "resume failed",
    ]);
  });
});

describe("useAgUiRuntime approvals that cannot be completed through the seam", () => {
  it("leaves a batch bespoke when a gate names a tool call the message never rendered", async () => {
    // The aggregator clears its tool calls on `RUN_STARTED`, so a gate naming a
    // call from an earlier run has no part to bind to.
    const unbound: AgUiInterrupt = {
      id: "int-2",
      reason: "tool_call",
      toolCallId: "tc-missing",
    };
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
      subscriber.onToolCallEndEvent?.({
        event: { type: "TOOL_CALL_END", toolCallId: "tc-1" },
      });
      subscriber.onRunFinishedEvent?.({
        event: {
          type: "RUN_FINISHED",
          runId: "run-1",
          outcome: { type: "interrupt", interrupts: [GATE, unbound] },
        },
      });
      subscriber.onRunFinalized?.(undefined);
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;

    const { result } = renderHook(() => useAgUiRuntime({ agent }));
    render(
      <AssistantRuntimeProvider runtime={result.current}>
        <SteerAway />
      </AssistantRuntimeProvider>,
    );
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "delete it" }],
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

    // Nothing is gated, so the rendered sibling cannot take a decision the
    // resume could never carry; both interrupts stay on the bespoke hooks.
    expect(allToolCalls(result.current).map((part) => part.approval)).toEqual([
      undefined,
    ]);
    expect(interruptsRef.current.map((interrupt) => interrupt.id)).toEqual([
      "int-1",
      "int-2",
    ]);
  });

  it("closes the gate when a resolved override settles it without a decision", async () => {
    const { runtime, runAgent } = await gatedThread();

    await act(async () => {
      await submitRef.current!([
        { interruptId: "int-1", status: "resolved", payload: { answer: 42 } },
      ]);
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    // The interrupt is closed, so the gate must not stay actionable: a click
    // would find no pending interrupt on the thread.
    expect(allToolCalls(runtime.current).map((part) => part.approval)).toEqual([
      { id: "int-1", resolution: "cancelled" },
    ]);
  });
});

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { AssistantRuntime, ToolCallMessagePart } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";
import { useAgUiSteerAway } from "./hooks";
import type { AgUiInterrupt } from "./runtime/types";

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

const CONFIRMATION: AgUiInterrupt = {
  id: "int-1",
  reason: "confirmation",
  toolCallId: "tc-1",
  message: "Delete /tmp/a?",
};

// Gates the first run on an interrupt and lets every later run settle, so a
// resumed run is observable as a second call rather than a second gate.
const gatingAgent = (interrupts: readonly AgUiInterrupt[] = [CONFIRMATION]) => {
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

const mount = (runtime: AssistantRuntime) =>
  render(
    <AssistantRuntimeProvider runtime={runtime}>
      <SteerAway />
    </AssistantRuntimeProvider>,
  );

const gatedThread = async (
  interrupts: readonly AgUiInterrupt[] = [CONFIRMATION],
) => {
  const { agent, runAgent } = gatingAgent(interrupts);
  const { result } = renderHook(() => useAgUiRuntime({ agent }));
  mount(result.current);

  await act(async () => {
    await result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "delete it" }],
    });
  });
  await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));

  return { runtime: result, runAgent };
};

const lastAssistant = (runtime: AssistantRuntime) =>
  runtime.thread.getState().messages.at(-1)!;

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

const toolCallParts = (runtime: AssistantRuntime) =>
  lastAssistant(runtime).content.filter(
    (part): part is ToolCallMessagePart => part.type === "tool-call",
  );

const resumeOf = (runAgent: ReturnType<typeof vi.fn>) =>
  (runAgent.mock.calls.at(-1)?.[0] as { resume?: unknown } | undefined)?.resume;

afterEach(() => cleanup());

describe("useAgUiRuntime tool approvals", () => {
  it("surfaces a pending confirmation as an approval gate on the gated tool call", async () => {
    const { runtime } = await gatedThread();

    expect(lastAssistant(runtime.current).status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(toolCallParts(runtime.current)[0]!.approval).toEqual({
      id: "int-1",
    });
    expect(gatedPart(runtime.current).getState().status).toMatchObject({
      type: "requires-action",
    });
  });

  it("leaves a tool call ungated when the interrupt is not a confirmation", async () => {
    const { runtime } = await gatedThread([
      { ...CONFIRMATION, reason: "input_required" },
    ]);

    expect(toolCallParts(runtime.current)[0]!.approval).toBeUndefined();
  });

  it("resumes the run with a resolved response when the gate is allowed", async () => {
    const { runtime, runAgent } = await gatedThread();

    await act(async () => {
      gatedPart(runtime.current).respondToToolApproval({ approved: true });
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved" },
    ]);
  });

  it("cancels the interrupt when the gate is denied", async () => {
    const { runtime, runAgent } = await gatedThread();

    await act(async () => {
      gatedPart(runtime.current).respondToToolApproval({ approved: false });
    });

    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "cancelled" },
    ]);
  });

  it("never answers the gated tool call with a fabricated result", async () => {
    const { runtime, runAgent } = await gatedThread();

    await act(async () => {
      gatedPart(runtime.current).respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    expect(
      allToolCalls(runtime.current).every((part) => part.result === undefined),
    ).toBe(true);
  });

  it("refuses a second decision on a settled gate", async () => {
    const { runtime, runAgent } = await gatedThread();
    const part = gatedPart(runtime.current);

    await act(async () => {
      part.respondToToolApproval({ approved: true });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    expect(() => part.respondToToolApproval({ approved: false })).toThrow(
      "Tool call has no pending approval",
    );
  });

  it("holds the run until every gate in the batch is decided", async () => {
    const second: AgUiInterrupt = {
      id: "int-2",
      reason: "confirmation",
      toolCallId: "tc-2",
      message: "Delete /tmp/b?",
    };
    const { runtime, runAgent } = await gatedThread([CONFIRMATION, second]);

    await act(async () => {
      gatedPart(runtime.current, "tc-1").respondToToolApproval({
        approved: true,
      });
    });
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(toolCallParts(runtime.current)[0]!.approval).toEqual({
      id: "int-1",
      approved: true,
    });

    await act(async () => {
      gatedPart(runtime.current, "tc-2").respondToToolApproval({
        approved: false,
      });
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(resumeOf(runAgent)).toEqual([
      { interruptId: "int-1", status: "resolved" },
      { interruptId: "int-2", status: "cancelled" },
    ]);
  });

  it("closes an undecided gate when the interrupt is discarded", async () => {
    const { runtime } = await gatedThread();

    await act(async () => {
      await steerAwayRef.current!("never mind");
    });

    const gate = allToolCalls(runtime.current).find(
      (part) => part.approval?.id === "int-1",
    );
    expect(gate?.approval).toEqual({ id: "int-1", resolution: "cancelled" });
  });
});

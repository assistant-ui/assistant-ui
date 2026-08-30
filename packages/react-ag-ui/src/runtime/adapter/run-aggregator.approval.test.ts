import { describe, it, expect, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "./run-aggregator";
import type { AgUiInterrupt } from "../types";

const GATE: AgUiInterrupt = {
  id: "int-1",
  reason: "tool_call",
  toolCallId: "tc-1",
  message: "Delete /tmp/a?",
};

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

const gatedAggregator = () => {
  const emitted: ChatModelRunResult[] = [];
  const aggregator = new RunAggregator({
    showThinking: false,
    logger: noopLogger,
    emit: (result) => {
      emitted.push(result);
    },
  });

  aggregator.handle({ type: "RUN_STARTED", runId: "run-1" });
  aggregator.handle({
    type: "TOOL_CALL_START",
    toolCallId: "tc-1",
    toolCallName: "delete_file",
  });
  aggregator.handle({
    type: "TOOL_CALL_ARGS",
    toolCallId: "tc-1",
    delta: '{"path":"/tmp/a"}',
  });
  aggregator.handle({ type: "TOOL_CALL_END", toolCallId: "tc-1" });
  aggregator.handle({
    type: "RUN_FINISHED",
    runId: "run-1",
    outcome: { type: "interrupt", interrupts: [GATE] },
  } as any);

  return { aggregator, emitted, last: () => emitted[emitted.length - 1]! };
};

const approvalOf = (result: ChatModelRunResult) => {
  const part = (result.content ?? []).find((p) => p.type === "tool-call");
  return (part as { approval?: unknown } | undefined)?.approval;
};

describe("RunAggregator tool approval projection", () => {
  it("projects the gate while the run awaits the interrupt", () => {
    const { last } = gatedAggregator();

    expect(last().status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(approvalOf(last())).toMatchObject({ id: "int-1" });
  });

  /**
   * The gate cannot be clicked once the run is unresumable, but the interrupts
   * stay on the message: the bespoke hooks read that payload, and dropping it
   * would take a shipped surface away with the projection.
   */
  it("drops the gate when the run then errors, keeping the interrupts", () => {
    const { aggregator, last } = gatedAggregator();

    aggregator.handle({ type: "RUN_ERROR", message: "stream dropped" } as any);

    expect(last().status).toMatchObject({
      type: "incomplete",
      reason: "error",
    });
    expect(approvalOf(last())).toBeUndefined();
    expect(
      (last().metadata?.custom as Record<string, any> | undefined)?.agui
        ?.interrupts,
    ).toEqual([GATE]);
  });

  it("drops the gate when the run is then cancelled, keeping the interrupts", () => {
    const { aggregator, last } = gatedAggregator();

    aggregator.handle({ type: "RUN_CANCELLED" } as any);

    expect(last().status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(approvalOf(last())).toBeUndefined();
    expect(
      (last().metadata?.custom as Record<string, any> | undefined)?.agui
        ?.interrupts,
    ).toEqual([GATE]);
  });

  /**
   * `boundToolCallIds` decides whether the whole interrupt batch is
   * projectable at all: a gate naming a tool call the message never renders
   * makes the batch bespoke for everyone in it, including the root gate's
   * sibling. A subagent-scoped tool call has no interactive UI anywhere
   * (buildParts always passes an empty approvals map for subagent scope), so
   * it must not count as "rendered" when the root scope decides whether its
   * batch is bound.
   *
   * Before this fix, `boundToolCallIds` was built from every tool call
   * (`this.toolCalls.keys()`), so the subagent's own tool call counted as
   * "rendered" and the batch was wrongly treated as fully bound: the root
   * gate projected an approval that looked actionable, but
   * `buildToolApprovalResume`/`AgUiThreadRuntimeCore.respondToToolApproval`
   * still require a recorded decision for *every* interrupt in the batch —
   * including the subagent's, which no UI can ever produce — so clicking it
   * would record a local decision and then resume forever. Filtering
   * `boundToolCallIds` to root-scoped tool calls only makes the subagent gate
   * correctly unbound, which — per `projectAgUiToolApprovals`'s own
   * "batch mixing a gate with anything unrenderable projects nothing" rule —
   * collapses the *whole* batch to `EMPTY_APPROVALS`. That is the safe
   * outcome: no button is shown that can never actually complete, and the
   * interrupts stay on the message's metadata for the bespoke hooks to
   * handle instead.
   */
  it("collapses the whole batch to unbound, rather than showing an unresolvable root approval, when a subagent-scoped tool call shares the interrupt batch", () => {
    const emitted: ChatModelRunResult[] = [];
    const aggregator = new RunAggregator({
      showThinking: false,
      logger: noopLogger,
      emit: (result) => {
        emitted.push(result);
      },
    });

    const ROOT_GATE: AgUiInterrupt = {
      id: "int-root",
      reason: "tool_call",
      toolCallId: "tc-root",
      message: "Delete /tmp/root?",
    };
    const SUBAGENT_GATE: AgUiInterrupt = {
      id: "int-sub",
      reason: "tool_call",
      toolCallId: "tc-sub",
      message: "Delete /tmp/sub?",
    };

    aggregator.handle({ type: "RUN_STARTED", runId: "run-1" });
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-root",
      toolCallName: "delete_file",
    });
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tc-root",
      delta: '{"path":"/tmp/root"}',
    });
    aggregator.handle({ type: "TOOL_CALL_END", toolCallId: "tc-root" });
    aggregator.handle({
      type: "SUBAGENT_STARTED",
      subagentRunId: "sub-1",
      name: "cleanup",
      parentToolCallId: "tc-root",
    } as any);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-sub",
      toolCallName: "delete_file",
      subagentRunId: "sub-1",
    } as any);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tc-sub",
      delta: '{"path":"/tmp/sub"}',
      subagentRunId: "sub-1",
    } as any);
    aggregator.handle({
      type: "TOOL_CALL_END",
      toolCallId: "tc-sub",
      subagentRunId: "sub-1",
    } as any);
    aggregator.handle({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: {
        type: "interrupt",
        interrupts: [ROOT_GATE, SUBAGENT_GATE],
      },
    } as any);

    const result = emitted[emitted.length - 1]!;
    expect(result.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    // Neither gate renders — the batch is bespoke as a whole, not just the
    // subagent's unrenderable half of it.
    expect(approvalOf(result)).toBeUndefined();
    // The interrupts survive on the message metadata so the app's bespoke
    // interrupt hooks (useAgUiSubmitInterruptResponses / steerAway) can still
    // resolve the batch.
    expect(
      (result.metadata?.custom as Record<string, any> | undefined)?.agui
        ?.interrupts,
    ).toEqual([ROOT_GATE, SUBAGENT_GATE]);
  });

  it("still projects a root gate whose batch is entirely root-scoped, even while an unrelated subagent tool call is in flight", () => {
    const { aggregator, last } = gatedAggregator();

    aggregator.handle({
      type: "SUBAGENT_STARTED",
      subagentRunId: "sub-1",
      name: "cleanup",
    } as any);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-unrelated",
      toolCallName: "noop",
      subagentRunId: "sub-1",
    } as any);

    expect(last().status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(approvalOf(last())).toEqual({ id: "int-1" });
  });
});

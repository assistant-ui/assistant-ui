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
});

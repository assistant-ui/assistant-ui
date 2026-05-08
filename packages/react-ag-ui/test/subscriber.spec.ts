"use client";

import { describe, it, expect, vi } from "vitest";
import { createAgUiSubscriber } from "../src/runtime/adapter/subscriber";
import type { AgUiEvent } from "../src/runtime/types";

describe("createAgUiSubscriber", () => {
  it("dispatches typed events without duplication", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onTextMessageContentEvent?.({ event: { delta: "Hi" } });
    subscriber.onEvent?.({
      event: { type: "TEXT_MESSAGE_CONTENT", delta: "ignored" },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Hi",
    });
  });

  it("dispatches run error and invokes hook", () => {
    const events: AgUiEvent[] = [];
    const onRunFailed = vi.fn();
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
      onRunFailed,
    });

    const error = new Error("boom");
    subscriber.onRunFailed?.({ error });

    expect(onRunFailed).toHaveBeenCalledWith(error);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "RUN_ERROR", message: "boom" });
  });

  it("dispatches RUN_FINISHED with outcome from onRunFinishedEvent", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onRunFinishedEvent?.({
      event: {
        type: "RUN_FINISHED",
        runId: "run",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "int-1", reason: "tool_call" }],
        },
      },
    });
    // onRunFinalized fires after onRunFinishedEvent in real ag-ui flows;
    // we should not double-dispatch.
    subscriber.onRunFinalized?.();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "RUN_FINISHED",
      runId: "run",
      outcome: {
        type: "interrupt",
        interrupts: [{ id: "int-1", reason: "tool_call" }],
      },
    });
  });

  it("falls back to onRunFinalized when no RunFinishedEvent fires", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onRunFinalized?.();

    expect(events).toEqual([{ type: "RUN_FINISHED", runId: "run" }]);
  });

  it("falls back to onRunFinalized when RunFinishedEvent has no runId", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onRunFinishedEvent?.({
      event: { type: "RUN_FINISHED" },
    });
    subscriber.onRunFinalized?.();

    expect(events).toEqual([{ type: "RUN_FINISHED", runId: "run" }]);
  });

  it("dispatches reasoning handlers without duplication", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onReasoningMessageContentEvent?.({
      event: { messageId: "m1", delta: "think" },
    });
    subscriber.onEvent?.({
      event: {
        type: "REASONING_MESSAGE_CONTENT",
        messageId: "m1",
        delta: "ignored",
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "think",
    });
  });
});

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

  it("does not synthesize RUN_FINISHED when finalize follows a failed run", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onRunFailed?.({ error: new Error("boom") });
    subscriber.onRunFinalized?.();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "RUN_ERROR", message: "boom" });
  });

  it.each([
    [
      "AbortError name",
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    ],
    ["Fetch is aborted", new Error("Fetch is aborted")],
    [
      "signal is aborted without reason",
      new Error("signal is aborted without reason"),
    ],
    ["component unmounted", new Error("component unmounted")],
  ])(
    "dispatches RUN_CANCELLED instead of RUN_ERROR for abort-shaped errors (%s)",
    (_label, error) => {
      const events: AgUiEvent[] = [];
      const subscriber = createAgUiSubscriber({
        dispatch: (evt) => events.push(evt),
        runId: "run",
      });

      subscriber.onRunFailed?.({ error });
      subscriber.onRunFinalized?.();

      expect(events).toEqual([{ type: "RUN_CANCELLED" }]);
    },
  );

  it("still forwards abort errors to the onRunFailed callback", () => {
    const onRunFailed = vi.fn();
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
      onRunFailed,
    });

    const error = Object.assign(new Error("aborted"), { name: "AbortError" });
    subscriber.onRunFailed?.({ error });

    expect(onRunFailed).toHaveBeenCalledWith(error);
    expect(events).toEqual([{ type: "RUN_CANCELLED" }]);
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

  it("ignores onRunFinishedEvent payloads that parse as a different event type", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    subscriber.onRunFinishedEvent?.({
      event: { type: "TEXT_MESSAGE_CHUNK", delta: "hi" },
    });
    subscriber.onRunFinalized?.();

    expect(events).toEqual([{ type: "RUN_FINISHED", runId: "run" }]);
  });

  it("dispatches activity snapshots without duplication", () => {
    const events: AgUiEvent[] = [];
    const subscriber = createAgUiSubscriber({
      dispatch: (evt) => events.push(evt),
      runId: "run",
    });

    const event = {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "m1",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
    };
    subscriber.onActivitySnapshotEvent?.({ event });
    subscriber.onEvent?.({ event });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
    });
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

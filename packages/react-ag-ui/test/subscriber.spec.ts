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
});

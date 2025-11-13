"use client";

import { describe, it, expect, vi } from "vitest";
import { createAGUISubscriber } from "../src/runtime/adapter/subscriber";
import type { AGUIEvent } from "../src/runtime/types";

describe("createAGUISubscriber", () => {
  it("dispatches typed events without duplication", () => {
    const events: AGUIEvent[] = [];
    const subscriber = createAGUISubscriber({
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
    const events: AGUIEvent[] = [];
    const onRunFailed = vi.fn();
    const subscriber = createAGUISubscriber({
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

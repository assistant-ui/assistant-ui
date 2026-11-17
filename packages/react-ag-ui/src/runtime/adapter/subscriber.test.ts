import { describe, it, expect, vi } from "vitest";
import { createAgUiSubscriber } from "./subscriber";

const createSubscriber = () => {
  const dispatch = vi.fn();
  const logger = { debug: vi.fn(), error: vi.fn() };
  const subscriber = createAgUiSubscriber({ dispatch, logger });
  return { subscriber, dispatch, logger };
};

describe("createAgUiSubscriber", () => {
  it("accepts a new run after a terminal event", () => {
    const { subscriber, dispatch } = createSubscriber();

    subscriber.onRunFinishedEvent?.({
      event: { type: "RUN_FINISHED", runId: "first" },
    });
    subscriber.onRunStartedEvent?.({
      event: { type: "RUN_STARTED", runId: "second" },
    });
    subscriber.onRunFinishedEvent?.({
      event: { type: "RUN_FINISHED", runId: "second" },
    });

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "RUN_FINISHED",
      runId: "first",
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "RUN_STARTED",
      runId: "second",
    });
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      type: "RUN_FINISHED",
      runId: "second",
    });
  });

  it("dispatches ACTIVITY_DELTA as a typed event", () => {
    const { subscriber, dispatch } = createSubscriber();
    subscriber.onActivityDeltaEvent?.({
      event: {
        type: "ACTIVITY_DELTA",
        messageId: "act-1",
        activityType: "progress",
        patch: [{ op: "replace", path: "/step", value: 2 }],
      },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "ACTIVITY_DELTA",
      messageId: "act-1",
      activityType: "progress",
      patch: [{ op: "replace", path: "/step", value: 2 }],
    });
  });

  it("logs step boundaries and dispatches nothing", () => {
    const { subscriber, dispatch, logger } = createSubscriber();
    const started = { type: "STEP_STARTED", stepName: "plan" };
    const finished = { type: "STEP_FINISHED", stepName: "plan" };
    subscriber.onStepStartedEvent?.({ event: started });
    subscriber.onStepFinishedEvent?.({ event: finished });

    expect(dispatch).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      "[agui] step boundary ignored",
      started,
    );
    expect(logger.debug).toHaveBeenCalledWith(
      "[agui] step boundary ignored",
      finished,
    );
  });
});

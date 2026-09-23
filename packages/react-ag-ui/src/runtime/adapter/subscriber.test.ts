import { describe, it, expect, vi } from "vitest";
import { createAgUiSubscriber } from "./subscriber";

const createSubscriber = () => {
  const dispatch = vi.fn();
  const logger = { debug: vi.fn(), error: vi.fn() };
  const subscriber = createAgUiSubscriber({ dispatch, runId: "run-1", logger });
  return { subscriber, dispatch, logger };
};

describe("createAgUiSubscriber", () => {
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

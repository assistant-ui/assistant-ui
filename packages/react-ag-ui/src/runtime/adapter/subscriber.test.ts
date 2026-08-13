import { describe, expect, it, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { createAgUiSubscriber } from "./subscriber";
import { RunAggregator } from "./run-aggregator";
import { makeLogger } from "../logger";
import type { AgUiEvent } from "../types";

const setup = () => {
  const dispatched: AgUiEvent[] = [];
  const updates: ChatModelRunResult[] = [];
  const onRunFailed = vi.fn();
  const aggregator = new RunAggregator({
    showThinking: false,
    logger: makeLogger(),
    emit: (update) => updates.push(update),
  });
  const subscriber = createAgUiSubscriber({
    dispatch: (event) => {
      dispatched.push(event);
      aggregator.handle(event);
    },
    runId: "run-1",
    onRunFailed,
  });
  aggregator.handle({ type: "RUN_STARTED", runId: "run-1" });
  return { dispatched, updates, onRunFailed, subscriber };
};

const lastStatus = (updates: ChatModelRunResult[]) => updates.at(-1)?.status;

describe("createAgUiSubscriber", () => {
  describe("server-sent RUN_ERROR", () => {
    it("reaches the aggregator as an errored run", () => {
      const { dispatched, updates, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: { type: "RUN_ERROR", message: "upstream exploded", code: "500" },
      });
      subscriber.onRunFinalized?.();

      expect(dispatched).toContainEqual({
        type: "RUN_ERROR",
        message: "upstream exploded",
        code: "500",
      });
      expect(lastStatus(updates)).toEqual({
        type: "incomplete",
        reason: "error",
        error: "upstream exploded",
      });
    });

    it("does not let onRunFinalized synthesize a RUN_FINISHED afterwards", () => {
      const { dispatched, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: { type: "RUN_ERROR", message: "upstream exploded" },
      });
      subscriber.onRunFinalized?.();

      expect(dispatched.map((event) => event.type)).not.toContain(
        "RUN_FINISHED",
      );
    });

    it("reports the failure to the run-failed callback", () => {
      const { onRunFailed, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: { type: "RUN_ERROR", message: "upstream exploded", code: "500" },
      });

      expect(onRunFailed).toHaveBeenCalledTimes(1);
      const error = onRunFailed.mock.calls[0]![0] as Error;
      expect(error.message).toBe("upstream exploded");
      expect((error as Error & { code?: string }).code).toBe("500");
    });

    it("settles an aborted request as a cancellation, not an error", () => {
      const { dispatched, updates, onRunFailed, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: {
          type: "RUN_ERROR",
          message: "Request aborted",
          code: "abort",
        },
      });
      subscriber.onRunFinalized?.();

      expect(dispatched).toEqual([{ type: "RUN_CANCELLED" }]);
      expect(lastStatus(updates)).toEqual({
        type: "incomplete",
        reason: "cancelled",
      });
      expect(onRunFailed).not.toHaveBeenCalled();
    });

    it("keeps the business error when a transport failure follows", () => {
      const { dispatched, updates, onRunFailed, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: { type: "RUN_ERROR", message: "upstream exploded", code: "500" },
      });
      subscriber.onRunFailed?.({ error: new Error("socket died") });
      subscriber.onRunFinalized?.();

      expect(onRunFailed).toHaveBeenCalledTimes(1);
      expect((onRunFailed.mock.calls[0]![0] as Error).message).toBe(
        "upstream exploded",
      );
      expect(dispatched).toEqual([
        { type: "RUN_ERROR", message: "upstream exploded", code: "500" },
      ]);
      expect(lastStatus(updates)).toEqual({
        type: "incomplete",
        reason: "error",
        error: "upstream exploded",
      });
    });

    it("ignores a RUN_FINISHED that arrives after the error", () => {
      const { dispatched, updates, subscriber } = setup();

      subscriber.onRunErrorEvent?.({
        event: { type: "RUN_ERROR", message: "upstream exploded" },
      });
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: "run-1" },
      });

      expect(dispatched.map((event) => event.type)).toEqual(["RUN_ERROR"]);
      expect(lastStatus(updates)).toEqual({
        type: "incomplete",
        reason: "error",
        error: "upstream exploded",
      });
    });

    it("falls back to a generic message when the event carries none", () => {
      const { dispatched, onRunFailed, subscriber } = setup();

      subscriber.onRunErrorEvent?.({ event: { type: "RUN_ERROR" } });

      expect(dispatched).toContainEqual({ type: "RUN_ERROR" });
      expect((onRunFailed.mock.calls[0]![0] as Error).message).toBe(
        "Run failed",
      );
    });
  });

  it("still synthesizes RUN_FINISHED when a run ends without a terminal event", () => {
    const { dispatched, subscriber } = setup();

    subscriber.onRunFinalized?.();

    expect(dispatched).toContainEqual({ type: "RUN_FINISHED", runId: "run-1" });
  });
});

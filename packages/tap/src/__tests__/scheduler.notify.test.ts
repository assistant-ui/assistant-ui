import { describe, it, expect } from "vitest";
import {
  UpdateScheduler,
  flushTapSync,
  scheduleNotify,
} from "../core/scheduler";

describe("scheduleNotify", () => {
  it("delivers queued notifications when another drain task throws", () => {
    const events: string[] = [];
    const notifier = new UpdateScheduler(() =>
      scheduleNotify(() => events.push("notify")),
    );
    const thrower = new UpdateScheduler(() => {
      throw new Error("boom");
    });

    expect(() =>
      flushTapSync(() => {
        notifier.markDirty();
        thrower.markDirty();
      }),
    ).toThrow("boom");

    expect(events).toEqual(["notify"]);
  });

  it("keeps draining when a notification throws and aggregates the errors", () => {
    const events: string[] = [];
    const scheduler = new UpdateScheduler(() => {
      scheduleNotify(() => {
        throw new Error("notify-boom");
      });
      scheduleNotify(() => events.push("second"));
    });

    let caught: unknown;
    try {
      flushTapSync(() => scheduler.markDirty());
    } catch (error) {
      caught = error;
    }

    expect(events).toEqual(["second"]);
    expect((caught as Error).message).toBe("notify-boom");
  });

  it("aggregates a task error with a notification error", () => {
    const notifier = new UpdateScheduler(() =>
      scheduleNotify(() => {
        throw new Error("notify-boom");
      }),
    );
    const thrower = new UpdateScheduler(() => {
      throw new Error("task-boom");
    });

    let caught: unknown;
    try {
      flushTapSync(() => {
        notifier.markDirty();
        thrower.markDirty();
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect(
      (caught as AggregateError).errors.map((e) => (e as Error).message),
    ).toEqual(["task-boom", "notify-boom"]);
  });
});

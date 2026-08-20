import { describe, it, expect } from "vitest";
import {
  UpdateScheduler,
  flushTapSync,
  scheduleNotify,
  scheduleTask,
} from "../core/scheduler";
import { waitForNextTick } from "./test-utils";

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

describe("updates dispatched from notifications", () => {
  it("flushes a markDirty dispatched from a macrotask-flush notification", async () => {
    const events: string[] = [];
    const follower = new UpdateScheduler(() => events.push("follower ran"));
    const notifier = new UpdateScheduler(() =>
      scheduleNotify(() => follower.markDirty()),
    );

    notifier.markDirty();
    await waitForNextTick();

    expect(events).toEqual(["follower ran"]);
    expect(follower.isDirty).toBe(false);
  });

  it("flushes a markDirty dispatched from a flushTapSync notification", async () => {
    const events: string[] = [];
    const follower = new UpdateScheduler(() => events.push("follower ran"));
    const notifier = new UpdateScheduler(() =>
      scheduleNotify(() => follower.markDirty()),
    );

    flushTapSync(() => notifier.markDirty());
    await waitForNextTick();

    expect(events).toEqual(["follower ran"]);
    expect(follower.isDirty).toBe(false);
  });

  it("runs a task scheduled from a flushTapSync notification", async () => {
    const events: string[] = [];
    const notifier = new UpdateScheduler(() =>
      scheduleNotify(() => scheduleTask(() => events.push("task ran"))),
    );

    flushTapSync(() => notifier.markDirty());
    await waitForNextTick();

    expect(events).toEqual(["task ran"]);
  });

  it("flushes an update marked before the flushTapSync callback threw", async () => {
    const events: string[] = [];
    const scheduler = new UpdateScheduler(() => events.push("ran"));

    expect(() =>
      flushTapSync(() => {
        scheduler.markDirty();
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(events).toEqual([]);
    await waitForNextTick();

    expect(events).toEqual(["ran"]);
    expect(scheduler.isDirty).toBe(false);
  });
});

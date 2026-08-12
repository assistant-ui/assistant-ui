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
});

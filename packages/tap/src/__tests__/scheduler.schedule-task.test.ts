import { describe, it, expect } from "vitest";
import { scheduleTask, flushTapSync } from "../core/scheduler";
import { waitForNextTick } from "./test-utils";

describe("scheduleTask", () => {
  it("runs tasks in order on the next flush", async () => {
    const order: number[] = [];
    scheduleTask(() => order.push(1));
    scheduleTask(() => order.push(2));

    expect(order).toEqual([]);
    await waitForNextTick();
    expect(order).toEqual([1, 2]);
  });

  it("runs inside flushTapSync", () => {
    let ran = false;
    flushTapSync(() => scheduleTask(() => (ran = true)));
    expect(ran).toBe(true);
  });

  it("runs a task scheduled by another task in the same flush", () => {
    const order: number[] = [];
    flushTapSync(() =>
      scheduleTask(() => {
        order.push(1);
        scheduleTask(() => order.push(2));
      }),
    );
    expect(order).toEqual([1, 2]);
  });

  it("keeps running later tasks when one throws and rethrows aggregated", () => {
    const order: number[] = [];
    expect(() =>
      flushTapSync(() => {
        scheduleTask(() => {
          throw new Error("boom");
        });
        scheduleTask(() => order.push(2));
      }),
    ).toThrow(/boom/);
    expect(order).toEqual([2]);
  });

  it("trips the update depth limit on a self-rescheduling task", () => {
    let runs = 0;
    const loop = () => {
      runs++;
      scheduleTask(loop);
    };

    expect(() => flushTapSync(() => scheduleTask(loop))).toThrow(
      /Maximum update depth exceeded/,
    );
    expect(runs).toBeGreaterThan(0);
    expect(runs).toBeLessThanOrEqual(50);
  });
});

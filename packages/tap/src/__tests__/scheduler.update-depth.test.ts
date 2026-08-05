import { describe, it, expect } from "vitest";
import { UpdateScheduler, flushTapSync } from "../core/scheduler";

describe("scheduler update depth", () => {
  it("runs many independent schedulers in one flush without tripping the limit", async () => {
    let runCount = 0;
    const schedulers = Array.from(
      { length: 60 },
      () => new UpdateScheduler(() => runCount++),
    );

    for (const scheduler of schedulers) scheduler.markDirty();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runCount).toBe(60);
    expect(schedulers.every((scheduler) => !scheduler.isDirty)).toBe(true);
  });

  it("throws inside the markDirty call that schedules the run past the limit", () => {
    let caught: unknown;
    let selfRuns = 0;
    const self: UpdateScheduler = new UpdateScheduler(() => {
      selfRuns++;
      try {
        self.markDirty();
      } catch (error) {
        caught = error;
      }
    });

    flushTapSync(() => self.markDirty());

    expect(selfRuns).toBe(50);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/Maximum update depth exceeded/);
    expect((caught as Error).stack).toContain("markDirty");
  });

  it("stops a self-re-dirtying scheduler after the limit without starving others", () => {
    let selfRuns = 0;
    const self: UpdateScheduler = new UpdateScheduler(() => {
      selfRuns++;
      self.markDirty();
    });
    let otherRan = false;
    const other = new UpdateScheduler(() => {
      otherRan = true;
    });

    expect(() =>
      flushTapSync(() => {
        self.markDirty();
        other.markDirty();
      }),
    ).toThrow(/Maximum update depth exceeded/);

    expect(selfRuns).toBe(50);
    expect(otherRan).toBe(true);
  });

  it("leaves the offender clean and resumes on the next external markDirty", () => {
    let looping = true;
    let runCount = 0;
    const scheduler: UpdateScheduler = new UpdateScheduler(() => {
      runCount++;
      if (looping) scheduler.markDirty();
    });

    expect(() => flushTapSync(() => scheduler.markDirty())).toThrow(
      /Maximum update depth exceeded/,
    );
    expect(scheduler.isDirty).toBe(false);

    looping = false;
    const runsBefore = runCount;
    flushTapSync(() => scheduler.markDirty());
    expect(runCount).toBe(runsBefore + 1);
    expect(scheduler.isDirty).toBe(false);
  });
});

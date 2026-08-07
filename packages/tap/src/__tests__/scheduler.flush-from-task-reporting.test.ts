import { describe, it, expect, vi, afterEach } from "vitest";
import { UpdateScheduler } from "../core/scheduler";

const waitFlush = () => new Promise((r) => setTimeout(r, 10));

describe("scheduled flush error reporting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports each error escaping a scheduled flush exactly once", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const first = new Error("first");
    const second = new Error("second");

    new UpdateScheduler(() => {
      throw first;
    }).markDirty();
    new UpdateScheduler(() => {
      throw second;
    }).markDirty();

    await waitFlush();

    // the originals only, with no AggregateError wrapper alongside them
    expect(consoleError.mock.calls.map((call) => call[0])).toEqual([
      first,
      second,
    ]);
  });
});
